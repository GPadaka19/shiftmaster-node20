"use client";

import { FormMessage } from "@/components/form";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import type { Mode } from "@/lib/period/resolve";
import {
  copyFromWeek,
  createEmpty,
  deleteDraft,
  generateDraft,
  publishWeek,
  unpublishWeek,
  type RosterActionResult,
} from "./actions";

type Props = {
  weekStart: string;
  status: "none" | "draft" | "published";
  mode: Mode;
  previousWeek: { weekStart: string; label: string } | null;
};

export function WeekActions({ weekStart, status, mode, previousWeek }: Props) {
  const { pending, state: result, run: act } = useAction<RosterActionResult>();

  const copyLabel = previousWeek ? `Salin dari ${previousWeek.label}` : null;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {status === "none" && (
          <>
            {mode === "lecture" && (
              <Button className="h-10 px-4" disabled={pending} onClick={() => act(() => generateDraft(weekStart))}>
                Generate draf dari aturan
              </Button>
            )}
            {previousWeek && (
              <Button
                variant={mode === "lecture" ? "outline" : "default"}
                className="h-10 px-4"
                disabled={pending}
                onClick={() => act(() => copyFromWeek(weekStart, previousWeek.weekStart))}
              >
                {copyLabel}
              </Button>
            )}
            <Button variant="outline" className="h-10 px-4" disabled={pending} onClick={() => act(() => createEmpty(weekStart))}>
              Mulai dari kosong
            </Button>
          </>
        )}

        {status === "draft" && (
          <>
            <Button
              className="h-10 px-4"
              disabled={pending}
              onClick={() => act(() => publishWeek(weekStart), "Terbitkan roster ini? Staf akan langsung melihatnya.")}
            >
              Terbitkan
            </Button>
            {mode === "lecture" && (
              <Button
                variant="outline"
                className="h-10 px-4"
                disabled={pending}
                onClick={() => act(() => generateDraft(weekStart), "Generate ulang akan mengganti seluruh isi draf ini. Lanjutkan?")}
              >
                Generate ulang
              </Button>
            )}
            {previousWeek && (
              <Button
                variant="outline"
                className="h-10 px-4"
                disabled={pending}
                onClick={() =>
                  act(() => copyFromWeek(weekStart, previousWeek.weekStart), `Ganti isi draf dengan salinan ${previousWeek.label}?`)
                }
              >
                {copyLabel}
              </Button>
            )}
            <Button
              variant="destructive"
              className="h-10 px-4"
              disabled={pending}
              onClick={() => act(() => deleteDraft(weekStart), "Hapus draf roster minggu ini?")}
            >
              Hapus draf
            </Button>
          </>
        )}

        {status === "published" && (
          <Button
            variant="outline"
            className="h-10 px-4"
            disabled={pending}
            onClick={() => act(() => unpublishWeek(weekStart), "Tarik roster ke draf? Staf tidak akan melihatnya sampai diterbitkan lagi.")}
          >
            Tarik ke draf
          </Button>
        )}
      </div>

      {pending && <p className="text-sm text-muted-foreground">Memproses…</p>}
      <FormMessage error={result.error} success={result.success} />
      {result.warnings && result.warnings.length > 0 && (
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
          <p className="mb-1 font-medium">Catatan generator</p>
          <ul className="list-disc pl-5 text-muted-foreground">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
