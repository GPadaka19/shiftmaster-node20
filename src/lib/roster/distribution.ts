import type { GenArea } from "./generate";

export type DistributionRow = {
  memberId: number;
  nickname: string;
  g2: number;
  g7: number;
  studio: number;
  /** PKL / whole-building seats. */
  building: number;
  total: number;
  maxG2: number | null;
  /** Above maxG2 but within this is allowed when G2 seats were short (see G2_STRETCH). */
  stretchMaxG2: number | null;
};

/** How many duties each member has in the week, by kind of area. Counts duties, not hours. */
export function distribution(
  assignments: readonly { memberId: number; nickname: string; area: Pick<GenArea, "building" | "kind"> }[],
  caps: ReadonlyMap<number, { maxG2: number | null; stretchMaxG2?: number | null }>,
): DistributionRow[] {
  const rows = new Map<number, DistributionRow>();
  for (const { memberId, nickname, area } of assignments) {
    const row = rows.get(memberId) ?? {
      memberId,
      nickname,
      g2: 0,
      g7: 0,
      studio: 0,
      building: 0,
      total: 0,
      maxG2: caps.get(memberId)?.maxG2 ?? null,
      stretchMaxG2: caps.get(memberId)?.stretchMaxG2 ?? caps.get(memberId)?.maxG2 ?? null,
    };
    if (area.kind === "studio") row.studio++;
    else if (area.kind === "building") row.building++;
    else if (area.building === "G2") row.g2++;
    else row.g7++;
    row.total++;
    rows.set(memberId, row);
  }
  return [...rows.values()].sort((a, b) => a.nickname.localeCompare(b.nickname));
}
