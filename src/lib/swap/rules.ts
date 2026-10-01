import { TZDate } from "@date-fns/tz";
import { TIME_ZONE } from "@/lib/time";

// Rules for trading seats. Pure, so they are tested on their own and shared by
// the request form, the target's answer and the admin's approval.

export type SwapStatus = "awaiting_target" | "awaiting_admin" | "approved" | "rejected" | "declined" | "cancelled" | "expired";

/** Statuses that still lock both assignments: one active request per seat. */
export const ACTIVE_STATUSES: readonly SwapStatus[] = ["awaiting_target", "awaiting_admin"];

export const STATUS_LABEL: Record<SwapStatus, string> = {
  awaiting_target: "Menunggu rekan",
  awaiting_admin: "Menunggu admin",
  approved: "Disetujui",
  rejected: "Ditolak admin",
  declined: "Ditolak rekan",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
};

/** One side of a trade: a member's seat on a day. */
export type SwapSide = {
  assignmentId: number;
  memberId: number;
  pool: "lab" | "studio" | "pkl" | null;
  /** "yyyy-MM-dd" */
  date: string;
  rosterWeekId: number;
  weekMode: "lecture" | "maintenance";
  weekPublished: boolean;
  areaId: number;
  shiftId: number;
};

/**
 * Requests must be settled before the day starts: the deadline is the start of
 * `date` in WIB (that is, H-1 23:59). A shift today can no longer be traded.
 */
export function swapDeadline(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(new TZDate(year, month - 1, day, TIME_ZONE).getTime());
}

export function isPastDeadline(date: string, now: Date): boolean {
  return now.getTime() >= swapDeadline(date).getTime();
}

/** Why this seat cannot be traded at all, or null when it can be offered. */
export function seatBlockReason(seat: SwapSide, now: Date): string | null {
  if (!seat.weekPublished) return "Roster minggu ini belum terbit.";
  if (seat.weekMode !== "lecture") return "Tukar shift hanya untuk roster masa kuliah (Pagi ↔ Siang).";
  if (seat.pool === "pkl") return "Tugas PKL tidak bisa ditukar.";
  if (!seat.pool) return "Anggota ini tidak masuk roster.";
  if (isPastDeadline(seat.date, now)) return "Sudah lewat batas waktu: tukar shift harus tuntas paling lambat H-1 pukul 23.59.";
  return null;
}

/** Why these two seats cannot be traded, or null when they can. */
export function swapBlockReason(mine: SwapSide, theirs: SwapSide, now: Date): string | null {
  if (mine.memberId === theirs.memberId) return "Tidak bisa menukar shift dengan dirimu sendiri.";
  if (mine.rosterWeekId !== theirs.rosterWeekId || mine.date !== theirs.date) {
    return "Shift yang ditukar harus pada hari yang sama.";
  }
  const seatProblem = seatBlockReason(mine, now) ?? seatBlockReason(theirs, now);
  if (seatProblem) return seatProblem;
  if (mine.pool !== theirs.pool) return "Tukar shift hanya sesama pool: Lab ↔ Lab atau Studio ↔ Studio.";
  if (mine.shiftId === theirs.shiftId) return "Shift harus berbeda: Pagi ↔ Siang.";
  return null;
}

/** The seat a request was made for, and what it looks like now (null when deleted). */
export type SeatCheck = {
  snapshot: { memberId: number; areaId: number; shiftId: number };
  current: { memberId: number; areaId: number; shiftId: number } | null;
};

/** A request no longer applies once either seat was moved, cleared or reassigned in the editor. */
export function seatsChanged(...seats: SeatCheck[]): boolean {
  return seats.some(
    ({ snapshot, current }) =>
      !current ||
      current.memberId !== snapshot.memberId ||
      current.areaId !== snapshot.areaId ||
      current.shiftId !== snapshot.shiftId,
  );
}
