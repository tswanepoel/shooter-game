namespace Server;

public sealed record Vector3Dto(double X, double Y, double Z);

public sealed class PlayerState
{
    public required string Id { get; init; }
    public required Vector3Dto Position { get; set; }
    public double Yaw { get; set; }
    public double Pitch { get; set; }
    public bool Alive { get; set; } = true;
}

public sealed record PlayerSnapshotDto(string Id, Vector3Dto Position, double Yaw, double Pitch, bool Alive);

public sealed record WelcomeMessage(string Type, string Id, Vector3Dto Position, IReadOnlyList<PlayerSnapshotDto> Roster);

public sealed record JoinMessage(string Type, string Id, Vector3Dto Position, double Yaw, double Pitch, bool Alive);

public sealed record LeaveMessage(string Type, string Id);
