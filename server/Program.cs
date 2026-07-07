using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text.Json;
using Server;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseWebSockets();

var players = new ConcurrentDictionary<string, (WebSocket Socket, PlayerState State)>();
var spectators = new ConcurrentDictionary<string, WebSocket>();
var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
var combatCts = new CancellationTokenSource();

async Task BroadcastToAllAsync(byte[] payload)
{
    foreach (var (_, (socket, _)) in players)
    {
        if (socket.State == WebSocketState.Open)
        {
            await socket.SendAsync(new ArraySegment<byte>(payload), WebSocketMessageType.Text, true, CancellationToken.None);
        }
    }
}

var combat = new CombatService(players, jsonOptions, RandomSpawnPosition, BroadcastToAllAsync);
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
    var spectatorId = Guid.NewGuid().ToString();
    spectators[spectatorId] = socket;

    await SendAsync(socket, new LobbyMessage("lobby", spectatorId, GetTakenCharacterIds()));

    string? playerId = null;
    try
    {
        playerId = await SessionLoopAsync(socket, spectatorId);
    }
    catch (WebSocketException)
    {
        // Abrupt disconnect (network drop, tab kill); fall through to cleanup below.
    }
    finally
    {
        if (playerId is not null)
        {
            players.TryRemove(playerId, out _);
            await BroadcastAsync(playerId, new LeaveMessage("leave", playerId));
            await BroadcastTakenAsync();
        }
        else
        {
            spectators.TryRemove(spectatorId, out _);
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

IReadOnlyList<string> GetTakenCharacterIds() =>
    players.Values
        .Select(p => p.State.CharacterId)
        .Distinct()
        .ToList();

PlayerSnapshotDto ToSnapshot(PlayerState state) =>
    new(state.Id, state.Position, state.Yaw, state.Pitch, state.Alive, state.CharacterId, state.WeaponId ?? string.Empty);

async Task SendAsync<T>(WebSocket socket, T message)
{
    var json = JsonSerializer.SerializeToUtf8Bytes(message, jsonOptions);
    if (socket.State == WebSocketState.Open)
    {
        await socket.SendAsync(new ArraySegment<byte>(json), WebSocketMessageType.Text, true, CancellationToken.None);
    }
}

async Task BroadcastAsync<T>(string excludeId, T message)
{
    var json = JsonSerializer.SerializeToUtf8Bytes(message, jsonOptions);
    foreach (var (playerId, (socket, _)) in players)
    {
        if (playerId == excludeId || socket.State != WebSocketState.Open) continue;
        await socket.SendAsync(new ArraySegment<byte>(json), WebSocketMessageType.Text, true, CancellationToken.None);
    }
}

async Task BroadcastTakenAsync()
{
    var json = JsonSerializer.SerializeToUtf8Bytes(new TakenMessage("taken", GetTakenCharacterIds()), jsonOptions);
    foreach (var (_, socket) in spectators)
    {
        if (socket.State == WebSocketState.Open)
        {
            await socket.SendAsync(new ArraySegment<byte>(json), WebSocketMessageType.Text, true, CancellationToken.None);
        }
    }

    foreach (var (_, (socket, _)) in players)
    {
        if (socket.State == WebSocketState.Open)
        {
            await socket.SendAsync(new ArraySegment<byte>(json), WebSocketMessageType.Text, true, CancellationToken.None);
        }
    }
}

async Task RelayRawAsync(string senderId, byte[] payload)
{
    foreach (var (playerId, (socket, _)) in players)
    {
        if (playerId == senderId || socket.State != WebSocketState.Open) continue;
        await socket.SendAsync(new ArraySegment<byte>(payload), WebSocketMessageType.Text, true, CancellationToken.None);
    }
}

bool TryApplyLoadoutChange(string senderId, byte[] payload)
{
    if (!players.TryGetValue(senderId, out var entry)) return false;
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
    if (!players.TryGetValue(senderId, out var entry)) return false;
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
    if (!players.TryGetValue(playerId, out var entry)) return;
    var payload = JsonSerializer.SerializeToUtf8Bytes(new
    {
        type = "weapon",
        id = playerId,
        weaponId = entry.State.WeaponId ?? string.Empty,
        activeSlot = entry.State.ActiveSlot,
    }, jsonOptions);
    await BroadcastToAllAsync(payload);
}

async Task<string?> SessionLoopAsync(WebSocket socket, string spectatorId)
{
    var buffer = new byte[8192];
    string? playerId = null;

    while (socket.State == WebSocketState.Open)
    {
        var payload = await ReadTextMessageAsync(socket, buffer);
        if (payload is null) return playerId;

        if (playerId is null)
        {
            if (await TryPromoteSpectatorAsync(socket, spectatorId, payload) is string claimedId)
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
        await RelayRawAsync(playerId, payload);
    }

    return playerId;
}

async Task<string?> TryPromoteSpectatorAsync(WebSocket socket, string spectatorId, byte[] payload)
{
    string? characterId;
    string? primaryWeaponId = null;
    string? secondaryWeaponId = null;
    try
    {
        using var doc = JsonDocument.Parse(payload);
        var root = doc.RootElement;
        if (!root.TryGetProperty("type", out var typeProp)) return null;
        if (typeProp.GetString() != "claim") return null;
        if (!root.TryGetProperty("characterId", out var characterProp)) return null;
        characterId = characterProp.GetString();

        if (root.TryGetProperty("primaryWeaponId", out var primaryProp))
        {
            primaryWeaponId = primaryProp.ValueKind == JsonValueKind.Null ? null : primaryProp.GetString();
        }

        if (root.TryGetProperty("secondaryWeaponId", out var secondaryProp))
        {
            secondaryWeaponId = secondaryProp.ValueKind == JsonValueKind.Null ? null : secondaryProp.GetString();
        }
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

    if (players.Values.Any(p => p.State.CharacterId == characterId))
    {
        await SendAsync(socket, new ClaimRejectedMessage("claimRejected", "characterTaken"));
        return null;
    }

    spectators.TryRemove(spectatorId, out _);

    var playerId = Guid.NewGuid().ToString();
    var spawnPosition = RandomSpawnPosition();
    var state = new PlayerState
    {
        Id = playerId,
        Position = spawnPosition,
        CharacterId = characterId,
    };
    LoadoutRules.Apply(state, primaryWeaponId, secondaryWeaponId, "primary");

    var roster = players.Values
        .Select(p => ToSnapshot(p.State))
        .ToList();

    players[playerId] = (socket, state);

    await SendAsync(socket, new WelcomeMessage(
        "welcome",
        playerId,
        spawnPosition,
        state.CharacterId,
        state.WeaponId,
        state.PrimaryWeaponId,
        state.SecondaryWeaponId,
        state.ActiveSlot,
        roster));
    await BroadcastAsync(playerId, new JoinMessage(
        "join",
        playerId,
        spawnPosition,
        state.Yaw,
        state.Pitch,
        state.Alive,
        state.CharacterId,
        state.WeaponId ?? string.Empty));
    await BroadcastTakenAsync();

    return playerId;
}

async Task<byte[]?> ReadTextMessageAsync(WebSocket socket, byte[] buffer)
{
    using var stream = new MemoryStream();
    WebSocketReceiveResult result;
    do
    {
        result = await socket.ReceiveAsync(buffer, CancellationToken.None);
        if (result.MessageType == WebSocketMessageType.Close) return null;
        stream.Write(buffer, 0, result.Count);
    } while (!result.EndOfMessage);

    return result.MessageType == WebSocketMessageType.Text ? stream.ToArray() : null;
}