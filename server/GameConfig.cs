namespace Server;

public static class GameConfig
{
    // Must match client/src/config/physics.ts's WORLD_BOUNDARY exactly.
    public const double WorldBoundary = 45;

    // Spawn region sits well inside the world boundary.
    public const double SpawnAreaHalfExtent = 20;

    public const string DefaultCharacterId = "character-a";
    public const string DefaultWeaponId = "blaster-g";

    public static readonly HashSet<string> ValidCharacterIds =
    [
        "character-a", "character-b", "character-c", "character-d", "character-e", "character-f",
    ];

    public static readonly HashSet<string> ValidWeaponIds =
    [
        "blaster-a", "blaster-b", "blaster-c", "blaster-d", "blaster-e", "blaster-g", "blaster-h",
    ];
}