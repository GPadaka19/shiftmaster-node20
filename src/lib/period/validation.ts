import { z } from "zod";
import type { PeriodLike } from "./resolve";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid.");

export const periodInputSchema = z
  .object({
    name: z.string().trim().min(2, "Isi nama periode.").max(60),
    mode: z.enum(["lecture", "maintenance"], { message: "Pilih mode." }),
    startDate: isoDate,
    endDate: isoDate,
  })
  .refine((p) => p.endDate >= p.startDate, { message: "Tanggal selesai harus setelah tanggal mulai.", path: ["endDate"] });

export const holidayInputSchema = z.object({
  date: isoDate,
  name: z.string().trim().min(2, "Isi nama libur.").max(80),
  description: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => value || null),
});

/** The first existing period whose dates overlap `candidate` (ignoring itself). */
export function findOverlap<T extends PeriodLike & { id: number }>(
  periods: readonly T[],
  candidate: Pick<PeriodLike, "startDate" | "endDate">,
  ignoreId?: number,
): T | undefined {
  return periods.find(
    (p) => p.id !== ignoreId && p.startDate <= candidate.endDate && candidate.startDate <= p.endDate,
  );
}
