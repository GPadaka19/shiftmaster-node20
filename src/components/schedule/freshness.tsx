import { CloudOff, RefreshCw } from "lucide-react";
import { formatClock, formatDateTime, todayIso } from "@/lib/time";

/** When the Google Sheets data was read, and whether the last refresh failed. */
export function SheetFreshness({ fetchedAt, error }: { fetchedAt: Date | null; error: string | null }) {
  if (!fetchedAt) return null;
  const sameDay = todayIso(fetchedAt) === todayIso();
  const when = sameDay ? formatClock(fetchedAt) : formatDateTime(fetchedAt);

  return (
    <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      {error ? (
        <>
          <CloudOff className="size-3.5 text-destructive" aria-hidden="true" />
          Google Sheets tidak bisa dibaca; menampilkan data {when}
        </>
      ) : (
        <>
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Diperbarui {when}
        </>
      )}
    </p>
  );
}
