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
        "character-g", "character-h", "character-i", "character-j", "character-k", "character-l",
        "character-m", "character-n", "character-o", "character-p", "character-q", "character-r",
    ];

    public static readonly HashSet<string> ValidWeaponIds =
    [
        "blaster-a", "blaster-b", "blaster-c", "blaster-d", "blaster-e", "blaster-f", "blaster-g", "blaster-h",
        "blaster-i", "blaster-j", "blaster-k", "blaster-l", "blaster-m", "blaster-n", "blaster-o", "blaster-p",
        "blaster-q", "blaster-r",
    ];

    // Must match client/src/config/combat.ts and weapon damage defaults.
    public const double MaxHealth = 100;
    public const double RegenTickIntervalSeconds = 0.1;
    public const double RegenQuietPeriodSeconds = 6;
    public const double RegenPerTick = 4;
    public const double RespawnMinDelaySeconds = 1.5;
    public const double SuicideCooldownSeconds = 4;
    public const double SuicideRecentDamageBlockSeconds = 2;
    public const double DefaultWeaponDamage = 16;
    public const double BlasterEDamage = 24;

    public static double DamageForWeapon(string? weaponId) =>
        weaponId is null ? 0 : weaponId == "blaster-e" ? BlasterEDamage : DefaultWeaponDamage;
}