namespace Server;

public sealed record Vector3Dto(double X, double Y, double Z);

public sealed class PlayerState
{
    public required string Id { get; init; }
    public required string RoomCode { get; init; }
    public required string DisplayName { get; init; }
    public required Vector3Dto Position { get; set; }
    public double Yaw { get; set; }
    public double Pitch { get; set; }
    public bool Alive { get; set; } = true;
    public double Health { get; set; } = GameConfig.MaxHealth;
    public DateTime LastDamageUtc { get; set; } = DateTime.MinValue;
    public DateTime DeathUtc { get; set; } = DateTime.MinValue;
    public string CharacterId { get; set; } = GameConfig.DefaultCharacterId;
    public string? PrimaryWeaponId { get; set; }
    public string? SecondaryWeaponId { get; set; }
    public string ActiveSlot { get; set; } = "primary";
    public string? WeaponId { get; set; }
    public DateTime LastSuicideUtc { get; set; } = DateTime.MinValue;
}

public sealed record PlayerSnapshotDto(
    string Id,
    string DisplayName,
    Vector3Dto Position,
    double Yaw,
    double Pitch,
    bool Alive,
    string CharacterId,
    string WeaponId);

public sealed record RoomJoinedMessage(
    string Type,
    string SessionId,
    string RoomCode,
    string DisplayName,
    IReadOnlyList<string> TakenCharacterIds,
    IReadOnlyList<PlayerSnapshotDto> Players);

public sealed record RoomJoinRejectedMessage(string Type, string Reason);

public sealed record TakenMessage(string Type, IReadOnlyList<string> CharacterIds);

public sealed record ClaimRejectedMessage(string Type, string Reason);

public sealed record WelcomeMessage(
    string Type,
    string Id,
    string DisplayName,
    Vector3Dto Position,
    string CharacterId,
    IReadOnlyList<PlayerSnapshotDto> Roster);

public sealed record JoinMessage(
    string Type,
    string Id,
    string DisplayName,
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

public sealed record RespawnRequestMessage(
    string Type,
    string Id,
    string? PrimaryWeaponId,
    string? SecondaryWeaponId,
    string ActiveSlot);

public sealed record SuicideRequestMessage(string Type, string Id);