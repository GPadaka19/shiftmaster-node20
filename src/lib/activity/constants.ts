/** Events older than this are deleted the next time someone signs in. */
export const ACTIVITY_RETENTION_DAYS = 180;

/** Ranges offered on the Aktivitas page, in days. */
export const ACTIVITY_RANGES = [7, 30, 90] as const;

export const ACTIVITY_LABEL_MAX = 60;
export const ACTIVITY_PATH_MAX = 120;
/** Most events the browser may send in one request. */
export const ACTIVITY_BATCH_MAX = 40;
