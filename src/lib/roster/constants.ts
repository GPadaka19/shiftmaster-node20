/** G2 floor shifts per week for lab staff without their own cap. */
export const DEFAULT_MAX_G2 = 2;

/**
 * How far the default G2 cap may stretch (2 → 3) when the G2 seats of a shift
 * would otherwise be left to people who cannot take them, e.g. because some
 * lab staff are G7 only. A cap set on one member is never stretched.
 */
export const G2_STRETCH = 1;

/**
 * How many published weeks before the one being generated count toward G2
 * fairness: whoever had more G2 than their share in these weeks gets less now.
 */
export const G2_HISTORY_WEEKS = 4;

/** Settings key that overrides DEFAULT_MAX_G2 (edited on the rules page). */
export const MAX_G2_DEFAULT_SETTING = "max_g2_per_week_default";
