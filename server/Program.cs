using System.Net.WebSockets;
using System.Text.Json;
using Server;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseWebSockets();

var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
var roomManager = new RoomManager(jsonOptions);
var combatCts = new CancellationTokenSource();

async Task BroadcastCombatForPlayerAsync(string playerId, byte[] payload) =>
    await roomManager.BroadcastToRoomOfPlayerAsync(playerId, payload);

var combat = new CombatService(
    roomManager.Players,
    jsonOptions,
    RandomSpawnPosition,
    BroadcastCombatForPlayerAsync);
combat.StartRegenLoop(combatCts.Token);
app.Lifetime.ApplicationStopping.Register(() => combatCts.Cancel());

app.MapGet("/", () => "Shooter server running");

app.Map("/ws", async (HttpContext context) =>
{
    if (!context.WebSockets.IsWebSocketRequest)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        return;
    }

    using var socket = await context.WebSockets.AcceptWebSocketAsync();
    var clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "";
    string? sessionId = null;
    string? playerId = null;

    try
    {
        (sessionId, playerId) = await SessionLoopAsync(socket, clientIp);
    }
    catch (WebSocketException)
    {
        // Abrupt disconnect (network drop, tab kill); fall through to cleanup below.
    }
    catch (OperationCanceledException)
    {
        // Server shutting down; fall through to cleanup below.
    }
    finally
    {
        if (playerId is not null)
        {
            await roomManager.RemovePlayerAsync(playerId);
        }
        else if (sessionId is not null)
        {
            await roomManager.LeaveSessionAsync(sessionId);
        }
    }
});

app.Run();

Vector3Dto RandomSpawnPosition()
{
    var x = (Random.Shared.NextDouble() * 2 - 1) * GameConfig.SpawnHalfExtentX;
    var z = (Random.Shared.NextDouble() * 2 - 1) * GameConfig.SpawnHalfExtentZ;
    return new Vector3Dto(x, 0, z);
}

async Task SendAsync<T>(WebSocket socket, T message)
{
    var json = JsonSerializer.SerializeToUtf8Bytes(message, jsonOptions);
    if (socket.State == WebSocketState.Open)
    {
        await socket.SendAsync(new ArraySegment<byte>(json), WebSocketMessageType.Text, true, app.Lifetime.ApplicationStopping);
    }
}

async Task<(string? SessionId, string? PlayerId)> SessionLoopAsync(WebSocket socket, string clientIp)
{
    var buffer = new byte[8192];
    string? sessionId = null;
    string? playerId = null;
    Room? room = null;

    while (socket.State == WebSocketState.Open)
    {
        var payload = await ReadTextMessageAsync(socket, buffer);
        if (payload is null) return (sessionId, playerId);

        if (sessionId is null)
        {
            if (await TryJoinRoomAsync(socket, payload, clientIp) is { } joined)
            {
                sessionId = joined.SessionId;
                room = joined.Room;
            }

            continue;
        }

        if (playerId is null)
        {
            if (await TryPromoteMemberAsync(socket, sessionId, room!, payload) is string claimedId)
            {
                playerId = claimedId;
            }

            continue;
        }

        if (combat.TryApplyHit(playerId, payload)) continue;
        if (combat.TryRequestSuicide(playerId, payload)) continue;
        if (combat.TryRequestRespawn(playerId, payload)) continue;
        if (TryApplyLoadoutChange(playerId, payload))
        {
            await BroadcastWeaponAsync(playerId);
            continue;
        }
        if (TryApplyWeaponChange(playerId, payload))
        {
            await BroadcastWeaponAsync(playerId);
            continue;
        }
        await roomManager.RelayInRoomAsync(playerId, payload);
    }

    return (sessionId, playerId);
}

async Task<(string SessionId, Room Room)?> TryJoinRoomAsync(WebSocket socket, byte[] payload, string clientIp)
{
    string? code;
    string? displayName;
    try
    {
        using var doc = JsonDocument.Parse(payload);
        var root = doc.RootElement;
        if (!root.TryGetProperty("type", out var typeProp)) return null;
        if (typeProp.GetString() != "joinRoom") return null;
        if (!root.TryGetProperty("code", out var codeProp)) return null;
        if (!root.TryGetProperty("displayName", out var nameProp)) return null;
        code = codeProp.GetString();
        displayName = nameProp.GetString();
    }
    catch (JsonException)
    {
        return null;
    }

    if (code is null || displayName is null) return null;

    var (result, sessionId, room) = await roomManager.TryJoinAsync(socket, code, displayName, clientIp);
    if (result == RoomJoinResult.NameTaken)
    {
        await SendAsync(socket, new RoomJoinRejectedMessage("roomJoinRejected", "nameTaken"));
        return null;
    }

    if (result == RoomJoinResult.Invalid)
    {
        await SendAsync(socket, new RoomJoinRejectedMessage("roomJoinRejected", "invalid"));
        return null;
    }

    if (result != RoomJoinResult.Ok || sessionId is null || room is null) return null;
    await SendAsync(socket, new RoomJoinedMessage(
        "roomJoined",
        sessionId,
        room.Code,
        displayName.Trim(),
        room.GetTakenCharacterIds(),
        room.BuildPlayerSnapshots()));

    return (sessionId, room);
}

async Task<string?> TryPromoteMemberAsync(WebSocket socket, string sessionId, Room room, byte[] payload)
{
    var member = room.GetMember(sessionId);
    if (member is null) return null;

    string? characterId;
    try
    {
        using var doc = JsonDocument.Parse(payload);
        var root = doc.RootElement;
        if (!root.TryGetProperty("type", out var typeProp)) return null;
        if (typeProp.GetString() != "claim") return null;
        if (!root.TryGetProperty("characterId", out var characterProp)) return null;
        characterId = characterProp.GetString();
    }
    catch (JsonException)
    {
        return null;
    }

    if (characterId is null || !GameConfig.ValidCharacterIds.Contains(characterId))
    {
        await SendAsync(socket, new ClaimRejectedMessage("claimRejected", "invalidCharacter"));
        return null;
    }

    if (room.GetTakenCharacterIds().Contains(characterId))
    {
        await SendAsync(socket, new ClaimRejectedMessage("claimRejected", "characterTaken"));
        return null;
    }

    var playerId = Guid.NewGuid().ToString();
    var spawnPosition = RandomSpawnPosition();
    var state = new PlayerState
    {
        Id = playerId,
        RoomCode = room.Code,
        DisplayName = member.DisplayName,
        Position = spawnPosition,
        CharacterId = characterId,
    };
    LoadoutRules.Apply(state, null, null, "primary");

    var roster = roomManager.Players.Values
        .Where(entry => entry.State.RoomCode == room.Code)
        .Select(entry => roomManager.ToSnapshot(entry.State))
        .ToList();

    roomManager.Players[playerId] = (socket, state);
    roomManager.RegisterPlayer(playerId, room.Code, sessionId);

    await SendAsync(socket, new WelcomeMessage(
        "welcome",
        playerId,
        state.DisplayName,
        spawnPosition,
        state.CharacterId,
        roster));
    await room.BroadcastAsync(new JoinMessage(
        "join",
        playerId,
        state.DisplayName,
        spawnPosition,
        state.Yaw,
        state.Pitch,
        state.Alive,
        state.CharacterId,
        state.WeaponId ?? string.Empty),
        excludeSessionId: sessionId);
    await roomManager.BroadcastTakenAsync(room);

    return playerId;
}

bool TryApplyLoadoutChange(string senderId, byte[] payload)
{
    if (!roomManager.Players.TryGetValue(senderId, out var entry)) return false;
    if (!entry.State.Alive) return false;

    try
    {
        using var doc = JsonDocument.Parse(payload);
        var root = doc.RootElement;
        if (!root.TryGetProperty("type", out var typeProp)) return false;
        if (typeProp.GetString() != "loadout") return false;

        string? primaryWeaponId = null;
        string? secondaryWeaponId = null;
        string? activeSlot = null;

        if (root.TryGetProperty("primaryWeaponId", out var primaryProp))
        {
            primaryWeaponId = primaryProp.ValueKind == JsonValueKind.Null ? null : primaryProp.GetString();
        }

        if (root.TryGetProperty("secondaryWeaponId", out var secondaryProp))
        {
            secondaryWeaponId = secondaryProp.ValueKind == JsonValueKind.Null ? null : secondaryProp.GetString();
        }

        if (root.TryGetProperty("activeSlot", out var slotProp))
        {
            activeSlot = slotProp.GetString();
        }

        LoadoutRules.Apply(entry.State, primaryWeaponId, secondaryWeaponId, activeSlot);
        return true;
    }
    catch (JsonException)
    {
        return false;
    }
}

bool TryApplyWeaponChange(string senderId, byte[] payload)
{
    if (!roomManager.Players.TryGetValue(senderId, out var entry)) return false;
    if (!entry.State.Alive) return false;

    try
    {
        using var doc = JsonDocument.Parse(payload);
        var root = doc.RootElement;
        if (!root.TryGetProperty("type", out var typeProp)) return false;
        if (typeProp.GetString() != "weapon") return false;
        if (!root.TryGetProperty("activeSlot", out var slotProp)) return false;

        var activeSlot = LoadoutRules.NormalizeActiveSlot(slotProp.GetString());
        entry.State.ActiveSlot = activeSlot;
        entry.State.WeaponId = LoadoutRules.ActiveWeaponId(
            entry.State.PrimaryWeaponId,
            entry.State.SecondaryWeaponId,
            entry.State.ActiveSlot);
        return true;
    }
    catch (JsonException)
    {
        return false;
    }
}

async Task BroadcastWeaponAsync(string playerId)
{
    if (!roomManager.Players.TryGetValue(playerId, out var entry)) return;
    var payload = JsonSerializer.SerializeToUtf8Bytes(new
    {
        type = "weapon",
        id = playerId,
        weaponId = entry.State.WeaponId ?? string.Empty,
        activeSlot = entry.State.ActiveSlot,
    }, jsonOptions);
    await roomManager.BroadcastToRoomOfPlayerAsync(playerId, payload);
}

async Task<byte[]?> ReadTextMessageAsync(WebSocket socket, byte[] buffer)
{
    using var stream = new MemoryStream();
    WebSocketReceiveResult result;
    do
    {
        result = await socket.ReceiveAsync(buffer, app.Lifetime.ApplicationStopping);
        if (result.MessageType == WebSocketMessageType.Close) return null;
        stream.Write(buffer, 0, result.Count);
    } while (!result.EndOfMessage);

    return result.MessageType == WebSocketMessageType.Text ? stream.ToArray() : null;
}