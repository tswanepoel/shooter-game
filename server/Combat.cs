using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text.Json;

namespace Server;

public sealed class CombatService
{
    private readonly ConcurrentDictionary<string, (WebSocket Socket, PlayerState State)> _players;
    private readonly JsonSerializerOptions _jsonOptions;
    private readonly Func<Vector3Dto> _randomSpawnPosition;
    private readonly Func<string, byte[], Task> _broadcastForPlayerAsync;

    public CombatService(
        ConcurrentDictionary<string, (WebSocket Socket, PlayerState State)> players,
        JsonSerializerOptions jsonOptions,
        Func<Vector3Dto> randomSpawnPosition,
        Func<string, byte[], Task> broadcastForPlayerAsync)
    {
        _players = players;
        _jsonOptions = jsonOptions;
        _randomSpawnPosition = randomSpawnPosition;
        _broadcastForPlayerAsync = broadcastForPlayerAsync;
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
        if (!TryParseHit(payload, out var shooterId, out var targetId, out var bodyPart, out var speedAtImpact)) return false;
        if (shooterId != senderId) return true;
        if (shooterId == targetId) return true;

        if (!_players.TryGetValue(shooterId, out var shooterEntry)) return true;
        if (!_players.TryGetValue(targetId, out var targetEntry)) return true;

        if (!shooterEntry.State.Alive) return true;

        var target = targetEntry.State;
        if (!target.Alive) return true;

        if (shooterEntry.State.WeaponId is null) return true;

        var damage = GameConfig.DamageForImpact(shooterEntry.State.WeaponId, speedAtImpact, bodyPart);
        ApplyDamage(target, damage, shooterId);
        return true;
    }

    public bool TryRequestSuicide(string senderId, byte[] payload)
    {
        if (!TryParseSuicideRequest(payload, out var playerId)) return false;
        if (playerId != senderId) return true;

        if (!_players.TryGetValue(playerId, out var entry)) return true;
        if (!entry.State.Alive) return true;

        var now = DateTime.UtcNow;
        if (now - entry.State.LastSuicideUtc < TimeSpan.FromSeconds(GameConfig.SuicideCooldownSeconds)) return true;
        if (entry.State.LastDamageUtc != DateTime.MinValue &&
            now - entry.State.LastDamageUtc < TimeSpan.FromSeconds(GameConfig.SuicideRecentDamageBlockSeconds))
        {
            return true;
        }

        entry.State.LastSuicideUtc = now;
        ApplyDeath(entry.State, playerId);
        return true;
    }

    public bool TryRequestRespawn(string senderId, byte[] payload)
    {
        if (!TryParseRespawnRequest(payload, out var playerId, out var primary, out var secondary, out var activeSlot)) {
            return false;
        }
        if (playerId != senderId) return true;

        if (!_players.TryGetValue(playerId, out var entry)) return true;
        if (entry.State.Alive) return true;

        var elapsed = DateTime.UtcNow - entry.State.DeathUtc;
        if (elapsed < TimeSpan.FromSeconds(GameConfig.RespawnMinDelaySeconds)) return true;

        LoadoutRules.Apply(entry.State, primary, secondary, activeSlot);
        TryRespawnPlayer(playerId);
        _ = BroadcastWeaponAsync(playerId);
        return true;
    }

    private void ApplyDamage(PlayerState target, double damage, string attackerId)
    {
        target.LastDamageUtc = DateTime.UtcNow;
        target.Health = Math.Max(0, target.Health - damage);
        _ = BroadcastHealthAsync(target.Id, target.Health, attackerId);

        if (target.Health <= 0 && target.Alive)
        {
            ApplyDeath(target, attackerId);
        }
    }

    private void ApplyDeath(PlayerState target, string killerId)
    {
        target.Alive = false;
        target.DeathUtc = DateTime.UtcNow;
        var deathAt = new DateTimeOffset(target.DeathUtc).ToUnixTimeMilliseconds();
        _ = BroadcastDeathAsync(target.Id, killerId, deathAt);
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

    private void TryRespawnPlayer(string playerId)
    {
        if (!_players.TryGetValue(playerId, out var entry)) return;
        if (entry.State.Alive) return;

        var spawn = _randomSpawnPosition();
        entry.State.Position = spawn;
        entry.State.Alive = true;
        entry.State.Health = GameConfig.MaxHealth;
        entry.State.LastDamageUtc = DateTime.MinValue;
        entry.State.DeathUtc = DateTime.MinValue;

        _ = BroadcastRespawnAsync(playerId, spawn);
        _ = BroadcastHealthAsync(playerId, entry.State.Health, attackerId: null);
    }

    private async Task BroadcastHealthAsync(string playerId, double health, string? attackerId)
    {
        await _broadcastForPlayerAsync(playerId, Serialize(new HealthMessage("health", playerId, health, attackerId)));
    }

    private async Task BroadcastDeathAsync(string victimId, string killerId, long deathAt)
    {
        await _broadcastForPlayerAsync(victimId, Serialize(new DeathMessage("death", victimId, killerId, deathAt)));
    }

    private async Task BroadcastRespawnAsync(string playerId, Vector3Dto position)
    {
        await _broadcastForPlayerAsync(playerId, Serialize(new RespawnMessage("respawn", playerId, position)));
    }

    private async Task BroadcastWeaponAsync(string playerId)
    {
        if (!_players.TryGetValue(playerId, out var entry)) return;
        await _broadcastForPlayerAsync(playerId, Serialize(new
        {
            type = "weapon",
            id = playerId,
            weaponId = entry.State.WeaponId ?? string.Empty,
            activeSlot = entry.State.ActiveSlot,
        }));
    }

    private byte[] Serialize<T>(T message) => JsonSerializer.SerializeToUtf8Bytes(message, _jsonOptions);

    private static bool TryParseHit(
        byte[] payload,
        out string shooterId,
        out string targetId,
        out string? bodyPart,
        out double speedAtImpact)
    {
        shooterId = string.Empty;
        targetId = string.Empty;
        bodyPart = null;
        speedAtImpact = 0;

        try
        {
            using var doc = JsonDocument.Parse(payload);
            var root = doc.RootElement;
            if (!root.TryGetProperty("type", out var typeProp) || typeProp.GetString() != "hit") return false;
            if (!root.TryGetProperty("id", out var shooterProp)) return false;
            if (!root.TryGetProperty("targetId", out var targetProp)) return false;

            shooterId = shooterProp.GetString() ?? string.Empty;
            targetId = targetProp.GetString() ?? string.Empty;
            if (root.TryGetProperty("bodyPart", out var bodyPartProp))
            {
                bodyPart = bodyPartProp.GetString();
            }

            if (root.TryGetProperty("speedAtImpact", out var speedProp) && speedProp.ValueKind == JsonValueKind.Number)
            {
                speedAtImpact = speedProp.GetDouble();
            }

            return shooterId.Length > 0 && targetId.Length > 0;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static bool TryParseRespawnRequest(
        byte[] payload,
        out string playerId,
        out string? primaryWeaponId,
        out string? secondaryWeaponId,
        out string? activeSlot)
    {
        playerId = string.Empty;
        primaryWeaponId = null;
        secondaryWeaponId = null;
        activeSlot = null;

        try
        {
            using var doc = JsonDocument.Parse(payload);
            var root = doc.RootElement;
            if (!root.TryGetProperty("type", out var typeProp) || typeProp.GetString() != "respawn") return false;
            if (!root.TryGetProperty("id", out var idProp)) return false;

            playerId = idProp.GetString() ?? string.Empty;
            if (playerId.Length == 0) return false;

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

            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static bool TryParseSuicideRequest(byte[] payload, out string playerId)
    {
        playerId = string.Empty;

        try
        {
            using var doc = JsonDocument.Parse(payload);
            var root = doc.RootElement;
            if (!root.TryGetProperty("type", out var typeProp) || typeProp.GetString() != "suicide") return false;
            if (!root.TryGetProperty("id", out var idProp)) return false;

            playerId = idProp.GetString() ?? string.Empty;
            return playerId.Length > 0;
        }
        catch (JsonException)
        {
            return false;
        }
    }
}