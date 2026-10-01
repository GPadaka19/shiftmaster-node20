"use client";

import { CopyCheck, X } from "lucide-react";
import { cn } from "cn";
import { FormMessage } from "@/components/form";
import { useAction } from "@/hooks/use-action";
import { POOL_SHORT_LABEL, type Pool } from "@/lib/members/labels";
import type { Mode } from "@/lib/period/resolve";
import { WEEKDAY_NAMES } from "@/lib/time";
import { clearSeat, copyDay, seatMember, type RosterActionResult } from "./actions";

export type EditorRow = {
  areaId: number;
  areaName: string;
  areaKind: "floor" | "studio" | "building";
  shiftId: number;
  shiftLabel: string;
  capacity: number;
};

export type EditorSeat = { id: number; memberId: number; nickname: string; inactive: boolean };
export type EditorMember = { id: number; nickname: string; pool: Pool | null };

type Props = {
  weekStart: string;
  mode: Mode;
  dates: string[];
  holidays: Record<string, string>;
  rows: EditorRow[];
  /** Key: `${date}|${areaId}|${shiftId}` */
  seats: Record<string, EditorSeat[]>;
  members: EditorMember[];
  /** Where each member sits per date, for "pindah dari …" hints. Key: date → memberId → label. */
  dutyLabels: Record<string, Record<number, string>>;
};

const POOL_FOR_KIND = { floor: "lab", studio: "studio", building: "pkl" } as const satisfies Record<EditorRow["areaKind"], Pool>;

export function RosterEditor({ weekStart, mode, dates, holidays, rows, seats, members, dutyLabels }: Props) {
  const { pending, state: result, run: act } = useAction<RosterActionResult>();

  return (
    <div className="grid gap-3">
      <FormMessage error={result.error} success={result.success} />
      <div className={cn("overflow-x-auto rounded-lg border border-border bg-card", pending && "opacity-70")} aria-busy={pending}>
        <table className="w-full min-w-[60rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="sticky left-0 z-10 w-36 bg-card px-3 py-2 text-left font-medium text-muted-foreground">
                Area
              </th>
              {dates.map((date, i) => (
                <th key={date} scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">
                  <span className="flex items-center justify-between gap-2">
                    <span>
                      {WEEKDAY_NAMES[i + 1]}
                      {holidays[date] && <span className="block text-xs font-normal">Libur: {holidays[date]}</span>}
                    </span>
                    <button
                      type="button"
                      title={`Salin ${WEEKDAY_NAMES[i + 1]} ke semua hari`}
                      aria-label={`Salin ${WEEKDAY_NAMES[i + 1]} ke semua hari`}
                      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      disabled={pending}
                      onClick={() => act(() => copyDay(weekStart, date), `Samakan semua hari minggu ini dengan ${WEEKDAY_NAMES[i + 1]}?`)}
                    >
                      <CopyCheck className="size-4" aria-hidden="true" />
                    </button>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const firstOfArea = index === 0 || rows[index - 1].areaId !== row.areaId;
              return (
                <tr key={`${row.areaId}-${row.shiftId}`} className={cn(firstOfArea && "border-t border-border")}>
                  <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2 text-left align-top font-normal">
                    {firstOfArea && <span className="block font-medium">{row.areaName}</span>}
                    <span className="text-muted-foreground">
                      {row.shiftLabel}
                      {row.capacity > 1 && ` · ${row.capacity} kursi`}
                    </span>
                  </th>
                  {dates.map((date) => {
                    const cell = seats[`${date}|${row.areaId}|${row.shiftId}`] ?? [];
                    return (
                      <td key={date} className={cn("px-2 py-2 align-top", holidays[date] && "bg-muted/40")}>
                        <SeatCell
                          cell={cell}
                          row={row}
                          mode={mode}
                          members={members}
                          dutyLabels={dutyLabels[date] ?? {}}
                          disabled={pending}
                          onAdd={(memberId) => act(() => seatMember(weekStart, date, row.areaId, row.shiftId, memberId))}
                          onRemove={(assignmentId) => act(() => clearSeat(weekStart, assignmentId))}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SeatCell({
  cell,
  row,
  mode,
  members,
  dutyLabels,
  disabled,
  onAdd,
  onRemove,
}: {
  cell: EditorSeat[];
  row: EditorRow;
  mode: Mode;
  members: EditorMember[];
  dutyLabels: Record<number, string>;
  disabled: boolean;
  onAdd: (memberId: number) => void;
  onRemove: (assignmentId: number) => void;
}) {
  const inCell = new Set(cell.map((s) => s.memberId));
  // In break weeks anyone can work a whole building, so no pool comes first.
  const preferred = mode === "maintenance" && row.areaKind === "building" ? null : POOL_FOR_KIND[row.areaKind];
  const options = members.filter((m) => !inCell.has(m.id));
  const first = preferred ? options.filter((m) => m.pool === preferred) : options;
  const rest = preferred ? options.filter((m) => m.pool !== preferred) : [];
  const label = (m: EditorMember) => (dutyLabels[m.id] ? `${m.nickname} (pindah dari ${dutyLabels[m.id]})` : m.nickname);

  return (
    <div className="grid gap-1.5">
      {cell.map((seat) => (
        <span
          key={seat.id}
          className={cn(
            "inline-flex h-7 items-center justify-between gap-1 rounded-md border border-border bg-background pr-0.5 pl-2",
            seat.inactive && "border-destructive/40 text-destructive",
          )}
        >
          <span className="truncate">{seat.nickname}</span>
          <button
            type="button"
            aria-label={`Kosongkan ${seat.nickname}`}
            title="Kosongkan"
            disabled={disabled}
            onClick={() => onRemove(seat.id)}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </span>
      ))}
      {cell.length < row.capacity && (
        <select
          aria-label={`Tambah ke ${row.areaName} ${row.shiftLabel}`}
          value=""
          disabled={disabled}
          onChange={(event) => event.target.value && onAdd(Number(event.target.value))}
          className="h-7 w-full rounded-md border border-dashed border-input bg-transparent px-1.5 text-sm text-muted-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">+ Tambah</option>
          {preferred ? (
            <>
              <optgroup label={POOL_SHORT_LABEL[preferred]}>
                {first.map((m) => (
                  <option key={m.id} value={m.id}>
                    {label(m)}
                  </option>
                ))}
              </optgroup>
              {rest.length > 0 && (
                <optgroup label="Lainnya">
                  {rest.map((m) => (
                    <option key={m.id} value={m.id}>
                      {label(m)}
                    </option>
                  ))}
                </optgroup>
              )}
            </>
          ) : (
            first.map((m) => (
              <option key={m.id} value={m.id}>
                {label(m)}
              </option>
            ))
          )}
        </select>
      )}
    </div>
  );
}
