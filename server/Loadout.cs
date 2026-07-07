namespace Server;

public static class LoadoutRules
{
    public static string? NormalizeWeaponId(string? weaponId) =>
        weaponId is not null && weaponId.Length > 0 && GameConfig.ValidWeaponIds.Contains(weaponId)
            ? weaponId
            : null;

    public static string NormalizeActiveSlot(string? slot) =>
        slot == "secondary" ? "secondary" : "primary";

    public static string? ActiveWeaponId(string? primary, string? secondary, string activeSlot) =>
        NormalizeActiveSlot(activeSlot) == "secondary" ? secondary : primary;

    public static void Apply(PlayerState state, string? primary, string? secondary, string? activeSlot)
    {
        state.PrimaryWeaponId = NormalizeWeaponId(primary);
        state.SecondaryWeaponId = NormalizeWeaponId(secondary);
        state.ActiveSlot = NormalizeActiveSlot(activeSlot);
        state.WeaponId = ActiveWeaponId(state.PrimaryWeaponId, state.SecondaryWeaponId, state.ActiveSlot);
    }
}