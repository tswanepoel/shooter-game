using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text.Json;

namespace Server;

public enum RoomJoinResult
{
    Ok,
    Invalid,
    NameTaken,
}

public sealed class RoomMember
{
    public required string SessionId { get; init; }
    public required WebSocket Socket { get; init; }
    public required string DisplayName { get; set; }
    public required string ClientIp { get; init; }
    public string? PlayerId { get; set; }
}

public sealed class Room
{
    private readonly RoomManager _manager;
    private readonly ConcurrentDictionary<string, RoomMember> _members = new();

    public string Code { get; }

    internal Room(string code, RoomManager manager)
    {
        Code = code;
        _manager = manager;
    }

    public IEnumerable<RoomMember> Members => _members.Values;

    public IReadOnlyList<string> GetTakenCharacterIds() =>
        _manager.Players.Values
            .Where(entry => entry.State.RoomCode == Code)
            .Select(entry => entry.State.CharacterId)
            .Distinct()
            .ToList();

    public IReadOnlyList<PlayerSnapshotDto> BuildPlayerSnapshots() =>
        _manager.Players.Values
            .Where(entry => entry.State.RoomCode == Code)
            .Select(entry => _manager.ToSnapshot(entry.State))
            .ToList();

    internal bool TryAddMember(RoomMember member) => _members.TryAdd(member.SessionId, member);

    internal bool TryRemoveMember(string sessionId) => _members.TryRemove(sessionId, out _);

    internal RoomMember? GetMember(string sessionId)
    {
        _members.TryGetValue(sessionId, out var member);
        return member;
    }

    internal bool HasDisplayName(string displayName) =>
        _members.Values.Any(member =>
            string.Equals(member.DisplayName, displayName, StringComparison.OrdinalIgnoreCase));

    internal bool HasDisplayNameFromClient(string displayName, string clientIp) =>
        _members.Values.Any(member =>
            string.Equals(member.DisplayName, displayName, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(member.ClientIp, clientIp, StringComparison.Ordinal));

    internal async Task EvictDisplayNameForClientAsync(string displayName, string clientIp)
    {
        var staleMembers = _members.Values
            .Where(member =>
                string.Equals(member.DisplayName, displayName, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(member.ClientIp, clientIp, StringComparison.Ordinal))
            .ToList();

        foreach (var member in staleMembers)
        {
            await _manager.LeaveSessionAsync(member.SessionId);
            // Do not await close here — the stale handler may be in its own cleanup
            // broadcast while this join is in flight, which deadlocks if we wait.
            _ = CloseSocketAsync(member.Socket);
        }
    }

    internal async Task BroadcastAsync<T>(T message, string? excludeSessionId = null)
    {
        var json = JsonSerializer.SerializeToUtf8Bytes(message, _manager.JsonOptions);
        await BroadcastRawAsync(json, excludeSessionId);
    }

    internal async Task BroadcastRawAsync(byte[] payload, string? excludeSessionId = null)
    {
        var sends = new List<Task>();
        foreach (var member in _members.Values)
        {
            if (excludeSessionId is not null && member.SessionId == excludeSessionId) continue;
            if (member.Socket.State != WebSocketState.Open) continue;
            sends.Add(SendSafeAsync(member.Socket, payload));
        }

        await Task.WhenAll(sends);
    }

    private static async Task SendSafeAsync(WebSocket socket, byte[] payload)
    {
        if (socket.State != WebSocketState.Open) return;
        try
        {
            await socket.SendAsync(
                new ArraySegment<byte>(payload),
                WebSocketMessageType.Text,
                true,
                CancellationToken.None);
        }
        catch (WebSocketException)
        {
            // Peer disconnected or is mid-close.
        }
    }

    private static async Task CloseSocketAsync(WebSocket socket)
    {
        if (socket.State != WebSocketState.Open &&
            socket.State != WebSocketState.CloseReceived)
        {
            return;
        }

        try
        {
            await socket.CloseAsync(
                WebSocketCloseStatus.NormalClosure,
                "replaced",
                CancellationToken.None);
        }
        catch (WebSocketException)
        {
            // Socket already torn down.
        }
    }
}

public sealed class RoomManager
{
    private readonly ConcurrentDictionary<string, Room> _rooms = new();
    private readonly ConcurrentDictionary<string, string> _sessionToRoomCode = new();
    private readonly ConcurrentDictionary<string, string> _playerToRoomCode = new();
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _joinLocks = new();

    public RoomManager(JsonSerializerOptions jsonOptions)
    {
        JsonOptions = jsonOptions;
    }

    public JsonSerializerOptions JsonOptions { get; }

    public ConcurrentDictionary<string, (WebSocket Socket, PlayerState State)> Players { get; } = new();

    public static string NormalizeCode(string code) =>
        code.Trim().ToLowerInvariant();

    public Room GetOrCreate(string code)
    {
        var normalized = NormalizeCode(code);
        if (normalized.Length == 0) throw new ArgumentException("room code required");
        return _rooms.GetOrAdd(normalized, roomCode => new Room(roomCode, this));
    }

    public bool TryGetRoom(string code, out Room? room)
    {
        room = null;
        var normalized = NormalizeCode(code);
        if (normalized.Length == 0) return false;
        return _rooms.TryGetValue(normalized, out room);
    }

    public Room? GetRoomForSession(string sessionId)
    {
        if (!_sessionToRoomCode.TryGetValue(sessionId, out var code)) return null;
        return _rooms.TryGetValue(code, out var room) ? room : null;
    }

    public Room? GetRoomForPlayer(string playerId)
    {
        if (!_playerToRoomCode.TryGetValue(playerId, out var code)) return null;
        return _rooms.TryGetValue(code, out var room) ? room : null;
    }

    public async Task<(RoomJoinResult Result, string? SessionId, Room? Room)> TryJoinAsync(
        WebSocket socket,
        string code,
        string displayName,
        string clientIp)
    {
        var normalized = NormalizeCode(code);
        var trimmedName = displayName.Trim();
        if (normalized.Length == 0 || trimmedName.Length == 0)
        {
            return (RoomJoinResult.Invalid, null, null);
        }

        var joinLock = _joinLocks.GetOrAdd(normalized, _ => new SemaphoreSlim(1, 1));
        await joinLock.WaitAsync();
        try
        {
            var room = GetOrCreate(normalized);
            if (room.HasDisplayName(trimmedName))
            {
                if (string.IsNullOrEmpty(clientIp) || !room.HasDisplayNameFromClient(trimmedName, clientIp))
                {
                    return (RoomJoinResult.NameTaken, null, null);
                }

                await room.EvictDisplayNameForClientAsync(trimmedName, clientIp);
            }

            var sessionId = Guid.NewGuid().ToString();
            var member = new RoomMember
            {
                SessionId = sessionId,
                Socket = socket,
                DisplayName = trimmedName,
                ClientIp = clientIp,
            };

            if (!room.TryAddMember(member))
            {
                return (RoomJoinResult.Invalid, null, null);
            }

            _sessionToRoomCode[sessionId] = room.Code;
            return (RoomJoinResult.Ok, sessionId, room);
        }
        finally
        {
            joinLock.Release();
        }
    }

    public async Task LeaveSessionAsync(string sessionId)
    {
        var room = GetRoomForSession(sessionId);
        if (room is null) return;

        var member = room.GetMember(sessionId);
        var playerId = member?.PlayerId;

        room.TryRemoveMember(sessionId);
        _sessionToRoomCode.TryRemove(sessionId, out _);

        if (playerId is not null)
        {
            await RemovePlayerAsync(playerId);
        }

        if (room.Members.Any()) return;

        _rooms.TryRemove(room.Code, out _);
    }

    public async Task RemovePlayerAsync(string playerId)
    {
        var room = GetRoomForPlayer(playerId);
        if (!Players.TryRemove(playerId, out _)) return;

        _playerToRoomCode.TryRemove(playerId, out _);
        if (room is null) return;

        foreach (var member in room.Members)
        {
            if (member.PlayerId == playerId) member.PlayerId = null;
        }

        await room.BroadcastAsync(new LeaveMessage("leave", playerId));
        await BroadcastTakenAsync(room);
    }

    public async Task BroadcastTakenAsync(Room room)
    {
        var message = new TakenMessage("taken", room.GetTakenCharacterIds());
        await room.BroadcastAsync(message);
    }

    public async Task BroadcastToRoomOfPlayerAsync(string playerId, byte[] payload, string? excludeSessionId = null)
    {
        var room = GetRoomForPlayer(playerId);
        if (room is null) return;
        await room.BroadcastRawAsync(payload, excludeSessionId);
    }

    public async Task RelayInRoomAsync(string senderPlayerId, byte[] payload)
    {
        var room = GetRoomForPlayer(senderPlayerId);
        if (room is null) return;

        string? senderSessionId = null;
        foreach (var member in room.Members)
        {
            if (member.PlayerId == senderPlayerId)
            {
                senderSessionId = member.SessionId;
                break;
            }
        }

        await room.BroadcastRawAsync(payload, excludeSessionId: senderSessionId);
    }

    public void RegisterPlayer(string playerId, string roomCode, string sessionId)
    {
        _playerToRoomCode[playerId] = roomCode;
        var room = GetOrCreate(roomCode);
        var member = room.GetMember(sessionId);
        if (member is not null) member.PlayerId = playerId;
    }

    public PlayerSnapshotDto ToSnapshot(PlayerState state) =>
        new(
            state.Id,
            state.DisplayName,
            state.Position,
            state.Yaw,
            state.Pitch,
            state.Alive,
            state.CharacterId,
            state.WeaponId ?? string.Empty);
}