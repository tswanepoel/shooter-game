using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text.Json;
using Server;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseWebSockets();

var players = new ConcurrentDictionary<string, (WebSocket Socket, PlayerState State)>();
var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

app.MapGet("/", () => "Shooter server running");

app.Map("/ws", async (HttpContext context) =>
{
    if (!context.WebSockets.IsWebSocketRequest)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        return;
    }

    using var socket = await context.WebSockets.AcceptWebSocketAsync();
    var id = Guid.NewGuid().ToString();
    var spawnPosition = RandomSpawnPosition();
    var state = new PlayerState { Id = id, Position = spawnPosition };

    var roster = players.Values
        .Select(p => new PlayerSnapshotDto(p.State.Id, p.State.Position, p.State.Yaw, p.State.Pitch, p.State.Alive))
        .ToList();

    players[id] = (socket, state);

    await SendAsync(socket, new WelcomeMessage("welcome", id, spawnPosition, roster));
    await BroadcastAsync(id, new JoinMessage("join", id, spawnPosition, state.Yaw, state.Pitch, state.Alive));

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
            await RelayRawAsync(senderId, stream.ToArray());
        }
    }
}
