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

    // Must match client/src/config/combat.ts and weapon damage defaults.
    public const double MaxHealth = 100;
    public const double RegenTickIntervalSeconds = 0.1;
    public const double RegenQuietPeriodSeconds = 6;
    public const double RegenPerTick = 4;
    public const double RespawnDelaySeconds = 3;
    public const double DefaultWeaponDamage = 20;
    public const double BlasterEDamage = 30;

    public static double DamageForWeapon(string weaponId) =>
        weaponId == "blaster-e" ? BlasterEDamage : DefaultWeaponDamage;
}