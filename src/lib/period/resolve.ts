export type Mode = "lecture" | "maintenance";

export const MODE_LABEL: Record<Mode, string> = {
  lecture: "Masa Kuliah",
  maintenance: "Libur Semester",
};

export type PeriodLike = {
  name: string;
  mode: Mode;
  /** "yyyy-MM-dd" */
  startDate: string;
  /** "yyyy-MM-dd", inclusive */
  endDate: string;
};

export type ModeResolution = {
  mode: Mode;
  period: PeriodLike | null;
  /**
   * period:   a period covers today
   * previous: no period covers today; the most recent past period is used
   * default:  no usable period at all; falls back to lecture
   */
  source: "period" | "previous" | "default";
};

/**
 * Which mode the app is in on `today` ("yyyy-MM-dd"). ISO dates compare
 * correctly as strings, so no date parsing is needed.
 */
export function resolveMode(periods: readonly PeriodLike[], today: string): ModeResolution {
  const covering = periods
    .filter((p) => p.startDate <= today && today <= p.endDate)
    .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
  if (covering) return { mode: covering.mode, period: covering, source: "period" };

  const previous = periods
    .filter((p) => p.endDate < today)
    .sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
  if (previous) return { mode: previous.mode, period: previous, source: "previous" };

  return { mode: "lecture", period: null, source: "default" };
}
