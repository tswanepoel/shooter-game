using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text.Json;
using Server;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseWebSockets();

var players = new ConcurrentDictionary<string, (WebSocket Socket, PlayerState State)>();
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
    var queryCharacterId = context.Request.Query["characterId"].FirstOrDefault();
    var characterId = await ReadSelectCharacterIdAsync(socket, queryCharacterId);

    var id = Guid.NewGuid().ToString();
    var spawnPosition = RandomSpawnPosition();
    var state = new PlayerState
    {
        Id = id,
        Position = spawnPosition,
        CharacterId = characterId,
        WeaponId = GameConfig.DefaultWeaponId,
    };

    var roster = players.Values
        .Select(p => ToSnapshot(p.State))
        .ToList();

    players[id] = (socket, state);

    await SendAsync(socket, new WelcomeMessage("welcome", id, spawnPosition, state.CharacterId, state.WeaponId, roster));
    await BroadcastAsync(id, new JoinMessage("join", id, spawnPosition, state.Yaw, state.Pitch, state.Alive, state.CharacterId, state.WeaponId));

    try
    {
        await ReceiveLoopAsync(socket, id);
    }
    catch (WebSocketException)
    {
        // Abrupt disconnect (network drop, tab kill); fall through to cleanup below.
    }
    finally
    {
        players.TryRemove(id, out _);
        await BroadcastAsync(id, new LeaveMessage("leave", id));
    }
});

app.Run();

Vector3Dto RandomSpawnPosition()
{
    var x = (Random.Shared.NextDouble() * 2 - 1) * GameConfig.SpawnAreaHalfExtent;
    var z = (Random.Shared.NextDouble() * 2 - 1) * GameConfig.SpawnAreaHalfExtent;
    return new Vector3Dto(x, 0, z);
}

string ResolveCharacterId(string? requested)
{
    if (requested is not null && GameConfig.ValidCharacterIds.Contains(requested))
    {
        return requested;
    }

    return GameConfig.DefaultCharacterId;
}

async Task<string> ReadSelectCharacterIdAsync(WebSocket socket, string? queryFallback)
{
    using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(2));

    try
    {
        var payload = await ReadSingleTextMessageAsync(socket, timeout.Token);
        if (payload is null) return ResolveCharacterId(queryFallback);

        using var doc = JsonDocument.Parse(payload);
        if (!doc.RootElement.TryGetProperty("type", out var typeProp)) return ResolveCharacterId(queryFallback);
        if (typeProp.GetString() != "select") return ResolveCharacterId(queryFallback);
        if (!doc.RootElement.TryGetProperty("characterId", out var characterProp)) return ResolveCharacterId(queryFallback);

        return ResolveCharacterId(characterProp.GetString());
    }
    catch (OperationCanceledException)
    {
        return ResolveCharacterId(queryFallback);
    }
    catch (JsonException)
    {
        return ResolveCharacterId(queryFallback);
    }
}

async Task<byte[]?> ReadSingleTextMessageAsync(WebSocket socket, CancellationToken cancellationToken)
{
    var buffer = new byte[4096];
    using var stream = new MemoryStream();

    WebSocketReceiveResult result;
    do
    {
        result = await socket.ReceiveAsync(buffer, cancellationToken);
        if (result.MessageType == WebSocketMessageType.Close) return null;
        stream.Write(buffer, 0, result.Count);
    } while (!result.EndOfMessage);

    return result.MessageType == WebSocketMessageType.Text ? stream.ToArray() : null;
}

PlayerSnapshotDto ToSnapshot(PlayerState state) =>
    new(state.Id, state.Position, state.Yaw, state.Pitch, state.Alive, state.CharacterId, state.WeaponId);

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

async Task RelayRawAsync(string senderId, byte[] payload)
{
    foreach (var (playerId, (socket, _)) in players)
    {
        if (playerId == senderId || socket.State != WebSocketState.Open) continue;
        await socket.SendAsync(new ArraySegment<byte>(payload), WebSocketMessageType.Text, true, CancellationToken.None);
    }
}

void TryApplyWeaponChange(string senderId, byte[] payload)
{
    if (!players.TryGetValue(senderId, out var entry)) return;

    try
    {
        using var doc = JsonDocument.Parse(payload);
        if (!doc.RootElement.TryGetProperty("type", out var typeProp)) return;
        if (typeProp.GetString() != "weapon") return;
        if (!doc.RootElement.TryGetProperty("weaponId", out var weaponProp)) return;

        var weaponId = weaponProp.GetString();
        if (weaponId is not null && GameConfig.ValidWeaponIds.Contains(weaponId))
        {
            entry.State.WeaponId = weaponId;
        }
    }
    catch (JsonException)
    {
        // Relay-only garbage; ignore.
    }
}

async Task ReceiveLoopAsync(WebSocket socket, string senderId)
{
    var buffer = new byte[8192];

    while (socket.State == WebSocketState.Open)
    {
        using var stream = new MemoryStream();
        WebSocketReceiveResult result;
        do
        {
            result = await socket.ReceiveAsync(buffer, CancellationToken.None);
            if (result.MessageType == WebSocketMessageType.Close) return;
            stream.Write(buffer, 0, result.Count);
        } while (!result.EndOfMessage);

        if (result.MessageType == WebSocketMessageType.Text)
        {
            var payload = stream.ToArray();
            if (combat.TryApplyHit(senderId, payload)) continue;
            if (combat.TryRequestRespawn(senderId, payload)) continue;
            TryApplyWeaponChange(senderId, payload);
            await RelayRawAsync(senderId, payload);
        }
    }
}