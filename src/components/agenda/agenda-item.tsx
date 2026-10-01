import { Wrench } from "lucide-react";
import type { AgendaEntry } from "@/lib/sheets/agenda";

/** One booking or maintenance activity. Borrower email never reaches this far. */
export function AgendaItem({ entry }: { entry: AgendaEntry }) {
  const meta = [entry.studyProgram, entry.className, entry.borrower].filter(Boolean).join(" · ");
  return (
    <li className="grid grid-cols-[5.5rem_1fr] gap-3 px-4 py-3">
      <span className="text-sm text-muted-foreground tabular-nums">{entry.time || "—"}</span>
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium tabular-nums">{entry.lab}</span>
          <span className="text-muted-foreground">·</span>
          <span className="font-medium">{entry.course || "Tanpa keterangan"}</span>
          {entry.isMaintenance && (
            <span className="inline-flex h-5 items-center gap-1 rounded border border-border px-1.5 text-xs font-medium">
              <Wrench className="size-3" aria-hidden="true" />
              Maintenance
            </span>
          )}
        </div>
        {meta && <p className="text-sm text-muted-foreground">{meta}</p>}
        {entry.notes && <p className="text-sm text-muted-foreground">{entry.notes}</p>}
        {entry.software && <p className="text-xs text-muted-foreground">Software: {entry.software}</p>}
      </div>
    </li>
  );
}

export function AgendaList({ entries }: { entries: AgendaEntry[] }) {
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {entries.map((entry, i) => (
        <AgendaItem key={`${entry.lab}-${entry.time}-${i}`} entry={entry} />
      ))}
    </ul>
  );
}
