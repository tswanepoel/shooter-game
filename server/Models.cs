namespace Server;

public sealed record Vector3Dto(double X, double Y, double Z);

public sealed class PlayerState
{
    public required string Id { get; init; }
    public required Vector3Dto Position { get; set; }
    public double Yaw { get; set; }
    public double Pitch { get; set; }
    public bool Alive { get; set; } = true;
    public double Health { get; set; } = GameConfig.MaxHealth;
    public DateTime LastDamageUtc { get; set; } = DateTime.MinValue;
    public DateTime DeathUtc { get; set; } = DateTime.MinValue;
    public string CharacterId { get; set; } = GameConfig.DefaultCharacterId;
    public string WeaponId { get; set; } = GameConfig.DefaultWeaponId;
}

public sealed record PlayerSnapshotDto(
    string Id,
    Vector3Dto Position,
    double Yaw,
    double Pitch,
    bool Alive,
    string CharacterId,
    string WeaponId);

public sealed record LobbyMessage(
    string Type,
    string SpectatorId,
    IReadOnlyList<string> TakenCharacterIds);

public sealed record TakenMessage(string Type, IReadOnlyList<string> CharacterIds);

public sealed record ClaimRejectedMessage(string Type, string Reason);

public sealed record WelcomeMessage(
    string Type,
    string Id,
    Vector3Dto Position,
    string CharacterId,
    string WeaponId,
    IReadOnlyList<PlayerSnapshotDto> Roster);

public sealed record JoinMessage(
    string Type,
    string Id,
    Vector3Dto Position,
    double Yaw,
    double Pitch,
    bool Alive,
    string CharacterId,
    string WeaponId);

public sealed record LeaveMessage(string Type, string Id);

public sealed record HitMessage(string Type, string Id, string TargetId);

public sealed record HealthMessage(string Type, string Id, double Health, string? AttackerId);

public sealed record DeathMessage(string Type, string VictimId, string KillerId, long DeathAt);

public sealed record RespawnMessage(string Type, string Id, Vector3Dto Position);

public sealed record RespawnRequestMessage(string Type, string Id);