import { ArrowLeftRight, CalendarOff } from "lucide-react";
import Link from "next/link";
import { cn } from "cn";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { AnswerButtons, SwapRequestForm, WithdrawButton } from "@/components/swap/swap-actions";
import { SwapCard } from "@/components/swap/swap-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { requireMember } from "@/lib/auth/session";
import { poolCanSwap, seatLabel } from "@/lib/swap/rules";
import { expireOverdueSwaps, myTradableSeats, swapCandidates, swapsForMember } from "@/lib/swap/service";
import { formatLongDate } from "@/lib/time";

export const metadata = { title: "Tukar Shift" };

export default async function SwapPage({ searchParams }: PageProps<"/swaps">) {
  const member = await requireMember();
  const params = await searchParams;

  if (!poolCanSwap(member.pool)) {
    return (
      <>
        <PageHeader title="Tukar Shift" />
        <EmptyState
          icon={ArrowLeftRight}
          title="Tukar shift hanya untuk staf Lab dan Studio"
          description={member.pool === "pkl" ? "Tugas PKL tidak bisa ditukar." : "Akunmu tidak masuk roster."}
        />
      </>
    );
  }

  const selectedId = Number(params.shift) || null;
  // Expire overdue requests first, so seats and candidates below never show a stale lock.
  await expireOverdueSwaps();
  const [swaps, seats, selected] = await Promise.all([
    swapsForMember(member.id),
    myTradableSeats(member.id),
    selectedId ? swapCandidates(member.id, selectedId) : null,
  ]);

  return (
    <>
      <PageHeader
        title="Tukar Shift"
        description="Tukar dengan rekan satu pool di hari yang sama, Pagi ↔ Siang. Rekan harus menerima, lalu satu admin menyetujui. Paling lambat H-1 pukul 23.59."
      />

      <div className="grid gap-8">
        {params.sent === "1" && (
          <Alert>
            <AlertDescription>Permintaan terkirim. Sekarang menunggu jawaban rekanmu.</AlertDescription>
          </Alert>
        )}

        {swaps.incoming.length > 0 && (
          <section aria-labelledby="incoming" className="grid gap-3">
            <h2 id="incoming" className="text-base font-semibold">
              Perlu jawabanmu
            </h2>
            {swaps.incoming.map((swap) => (
              <SwapCard key={swap.id} swap={swap} viewerId={member.id}>
                <AnswerButtons requestId={swap.id} />
              </SwapCard>
            ))}
          </section>
        )}

        <section aria-labelledby="new" className="grid gap-3">
          <h2 id="new" className="text-base font-semibold">
            Ajukan tukar
          </h2>
          {seats.length === 0 ? (
            <EmptyState
              icon={CalendarOff}
              title="Belum ada shift yang bisa ditukar"
              description="Shift harus ada di roster masa kuliah yang sudah terbit, mulai besok sampai dua minggu ke depan."
            />
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Pilih shift kamu yang mau ditukar.</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {seats.map((seat) => {
                  const active = seat.assignmentId === selectedId;
                  const body = (
                    <>
                      <span className="font-medium">{formatLongDate(seat.date)}</span>
                      <span className="text-sm text-muted-foreground">
                        {seat.locked ? "Sedang diproses" : seatLabel(seat)}
                      </span>
                    </>
                  );
                  return (
                    <li key={seat.assignmentId}>
                      {seat.locked ? (
                        <div className="grid gap-0.5 rounded-lg border border-border px-4 py-3 opacity-50">{body}</div>
                      ) : (
                        <Link
                          href={`/swaps?shift=${seat.assignmentId}`}
                          aria-current={active ? "true" : undefined}
                          scroll={false}
                          className={cn(
                            "grid gap-0.5 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-accent/50",
                            active ? "border-foreground" : "border-border",
                          )}
                        >
                          {body}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>

              {selected && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="mb-4 text-sm">
                    Shift kamu: <span className="font-medium">{formatLongDate(selected.mine.date)}</span>,{" "}
                    {seatLabel(selected.mine)}
                  </p>
                  {selected.mine.locked ? (
                    <p className="text-sm text-muted-foreground">Shift ini sedang diproses permintaan lain.</p>
                  ) : selected.mine.blockReason ? (
                    <p className="text-sm text-muted-foreground">{selected.mine.blockReason}</p>
                  ) : selected.candidates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Tidak ada rekan satu pool yang bertugas di shift sebaliknya pada hari itu.
                    </p>
                  ) : (
                    <SwapRequestForm
                      myAssignmentId={selected.mine.assignmentId}
                      candidates={selected.candidates.map((c) => ({
                        assignmentId: c.assignmentId,
                        nickname: c.nickname,
                        seat: seatLabel(c),
                        locked: c.locked,
                      }))}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </section>

        {swaps.outgoing.length > 0 && (
          <section aria-labelledby="outgoing" className="grid gap-3">
            <h2 id="outgoing" className="text-base font-semibold">
              Sedang berjalan
            </h2>
            {swaps.outgoing.map((swap) => (
              <SwapCard key={swap.id} swap={swap} viewerId={member.id}>
                {swap.requester.id === member.id && <WithdrawButton requestId={swap.id} />}
              </SwapCard>
            ))}
          </section>
        )}

        {swaps.history.length > 0 && (
          <section aria-labelledby="history" className="grid gap-3">
            <h2 id="history" className="text-base font-semibold">
              Riwayat
            </h2>
            {swaps.history.map((swap) => (
              <SwapCard key={swap.id} swap={swap} viewerId={member.id} />
            ))}
          </section>
        )}
      </div>
    </>
  );
}
