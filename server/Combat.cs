using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text.Json;

namespace Server;

public sealed class CombatService
{
    private readonly ConcurrentDictionary<string, (WebSocket Socket, PlayerState State)> _players;
    private readonly JsonSerializerOptions _jsonOptions;
    private readonly Func<Vector3Dto> _randomSpawnPosition;
    private readonly Func<byte[], Task> _broadcastToAllAsync;

    public CombatService(
        ConcurrentDictionary<string, (WebSocket Socket, PlayerState State)> players,
        JsonSerializerOptions jsonOptions,
        Func<Vector3Dto> randomSpawnPosition,
        Func<byte[], Task> broadcastToAllAsync)
    {
        _players = players;
        _jsonOptions = jsonOptions;
        _randomSpawnPosition = randomSpawnPosition;
        _broadcastToAllAsync = broadcastToAllAsync;
    }

    public void StartRegenLoop(CancellationToken cancellationToken)
    {
        _ = Task.Run(async () =>
        {
            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(GameConfig.RegenTickIntervalSeconds));
            while (await timer.WaitForNextTickAsync(cancellationToken))
            {
                ProcessRegenTick();
            }
        }, cancellationToken);
    }

    public bool TryApplyHit(string senderId, byte[] payload)
    {
        if (!TryParseHit(payload, out var shooterId, out var targetId)) return false;
        if (shooterId != senderId) return true;
        if (shooterId == targetId) return true;

        if (!_players.TryGetValue(shooterId, out var shooterEntry)) return true;
        if (!_players.TryGetValue(targetId, out var targetEntry)) return true;

        if (!shooterEntry.State.Alive) return true;

        var target = targetEntry.State;
        if (!target.Alive) return true;

        var damage = GameConfig.DamageForWeapon(shooterEntry.State.WeaponId);
        ApplyDamage(target, damage, shooterId);
        return true;
    }

    private void ApplyDamage(PlayerState target, double damage, string attackerId)
    {
        target.LastDamageUtc = DateTime.UtcNow;
        target.Health = Math.Max(0, target.Health - damage);
        _ = BroadcastHealthAsync(target.Id, target.Health, attackerId);

        if (target.Health <= 0 && target.Alive)
        {
            target.Alive = false;
            _ = BroadcastDeathAsync(target.Id, attackerId);
            _ = ScheduleRespawnAsync(target.Id);
        }
    }

    private void ProcessRegenTick()
    {
        var now = DateTime.UtcNow;
        var quiet = TimeSpan.FromSeconds(GameConfig.RegenQuietPeriodSeconds);

        foreach (var (_, (_, state)) in _players)
        {
            if (!state.Alive) continue;
            if (state.Health >= GameConfig.MaxHealth) continue;
            if (state.LastDamageUtc != DateTime.MinValue && now - state.LastDamageUtc < quiet) continue;

            state.Health = Math.Min(GameConfig.MaxHealth, state.Health + GameConfig.RegenPerTick);
            _ = BroadcastHealthAsync(state.Id, state.Health, attackerId: null);
        }
    }

    private async Task ScheduleRespawnAsync(string playerId)
    {
        await Task.Delay(TimeSpan.FromSeconds(GameConfig.RespawnDelaySeconds));

        if (!_players.TryGetValue(playerId, out var entry)) return;
        if (entry.State.Alive) return;

        var spawn = _randomSpawnPosition();
        entry.State.Position = spawn;
        entry.State.Alive = true;
        entry.State.Health = GameConfig.MaxHealth;
        entry.State.LastDamageUtc = DateTime.MinValue;

        await BroadcastRespawnAsync(playerId, spawn);
        await BroadcastHealthAsync(playerId, entry.State.Health, attackerId: null);
    }

    private async Task BroadcastHealthAsync(string playerId, double health, string? attackerId)
    {
        await _broadcastToAllAsync(Serialize(new HealthMessage("health", playerId, health, attackerId)));
    }

    private async Task BroadcastDeathAsync(string victimId, string killerId)
    {
        await _broadcastToAllAsync(Serialize(new DeathMessage("death", victimId, killerId)));
    }

    private async Task BroadcastRespawnAsync(string playerId, Vector3Dto position)
    {
        await _broadcastToAllAsync(Serialize(new RespawnMessage("respawn", playerId, position)));
    }

    private byte[] Serialize<T>(T message) => JsonSerializer.SerializeToUtf8Bytes(message, _jsonOptions);

    private static bool TryParseHit(byte[] payload, out string shooterId, out string targetId)
    {
        shooterId = string.Empty;
        targetId = string.Empty;

        try
        {
            using var doc = JsonDocument.Parse(payload);
            var root = doc.RootElement;
            if (!root.TryGetProperty("type", out var typeProp) || typeProp.GetString() != "hit") return false;
            if (!root.TryGetProperty("id", out var shooterProp)) return false;
            if (!root.TryGetProperty("targetId", out var targetProp)) return false;

            shooterId = shooterProp.GetString() ?? string.Empty;
            targetId = targetProp.GetString() ?? string.Empty;
            return shooterId.Length > 0 && targetId.Length > 0;
        }
        catch (JsonException)
        {
            return false;
        }
    }
}