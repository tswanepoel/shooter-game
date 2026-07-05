namespace Server;

public static class GameConfig
{
    // Must match client/src/config/physics.ts's WORLD_BOUNDARY exactly.
    public const double WorldBoundary = 45;

    // Spawn region sits well inside the world boundary.
    public const double SpawnAreaHalfExtent = 20;
}
