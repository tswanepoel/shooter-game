namespace Server;

public static class GameConfig
{
    // Must match client/src/config/shipment.ts yard bounds exactly.
    public const double WorldBoundaryX = 21.2;
    public const double WorldBoundaryZ = 15.2;
    public const double SpawnHalfExtentX = 16;
    public const double SpawnHalfExtentZ = 12;

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

    // Must match client/src/config/combat.ts.
    public const double MaxHealth = 100;
    public const double RegenTickIntervalSeconds = 0.1;
    public const double RegenQuietPeriodSeconds = 6;
    public const double RegenPerTick = 4;
    public const double RespawnMinDelaySeconds = 1.5;
    public const double SuicideCooldownSeconds = 4;
    public const double SuicideRecentDamageBlockSeconds = 2;

    // Must match client/src/sim/projectiles.ts BODY_PART_NAMES.
    public const double HeadshotMultiplier = 2.0;
    public const double LimbDamageMultiplier = 0.75;

    // Fire-event ground truth: damage = mass x speedAtImpact (momentum) x DamagePerMomentum x body-part
    // multiplier. Must match client/src/config/weapons.ts mass/projectileSpeed and ballistics.ts calibration.
    public const double DamagePerMomentum = 0.0444;

    public static readonly Dictionary<string, double> WeaponMass = new()
    {
        ["blaster-a"] = 1.6,
        ["blaster-b"] = 0.35,
        ["blaster-c"] = 0.45,
        ["blaster-d"] = 0.7,
        ["blaster-e"] = 1.1,
        ["blaster-f"] = 1.1,
        ["blaster-g"] = 0.45,
        ["blaster-h"] = 0.45,
        ["blaster-i"] = 0.35,
        ["blaster-j"] = 1.3,
        ["blaster-k"] = 1.3,
        ["blaster-l"] = 0.45,
        ["blaster-m"] = 0.45,
        ["blaster-n"] = 0.7,
        ["blaster-o"] = 1.3,
        ["blaster-p"] = 0.45,
        ["blaster-q"] = 0.7,
        ["blaster-r"] = 0.7,
    };

    public static readonly Dictionary<string, double> WeaponMuzzleVelocity = new()
    {
        ["blaster-a"] = 700,
        ["blaster-b"] = 600,
        ["blaster-c"] = 900,
        ["blaster-d"] = 500,
        ["blaster-e"] = 1200,
        ["blaster-f"] = 800,
        ["blaster-g"] = 800,
        ["blaster-h"] = 750,
        ["blaster-i"] = 800,
        ["blaster-j"] = 800,
        ["blaster-k"] = 800,
        ["blaster-l"] = 800,
        ["blaster-m"] = 800,
        ["blaster-n"] = 800,
        ["blaster-o"] = 800,
        ["blaster-p"] = 800,
        ["blaster-q"] = 800,
        ["blaster-r"] = 800,
    };

    public static double DamageForImpact(string? weaponId, double speedAtImpact, string? bodyPart)
    {
        if (weaponId is null || !WeaponMass.TryGetValue(weaponId, out var mass)) return 0;

        var muzzleVelocity = WeaponMuzzleVelocity.GetValueOrDefault(weaponId, speedAtImpact);
        var clampedSpeed = Math.Clamp(speedAtImpact, 0, muzzleVelocity);
        var momentum = mass * clampedSpeed;
        return momentum * DamagePerMomentum * MultiplierForBodyPart(bodyPart);
    }

    public static double MultiplierForBodyPart(string? bodyPart) => bodyPart switch
    {
        "head" => HeadshotMultiplier,
        "arm-left" or "arm-right" or "leg-left" or "leg-right" => LimbDamageMultiplier,
        _ => 1.0,
    };
}