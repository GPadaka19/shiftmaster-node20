import { CheckCheck, TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { DecideButtons } from "@/components/swap/swap-actions";
import { SwapCard } from "@/components/swap/swap-card";
import { requireRole } from "@/lib/auth/session";
import { swapPreviewWarnings, swapsForAdmin } from "@/lib/swap/service";

export const metadata = { title: "Persetujuan Tukar" };

export default async function SwapApprovalsPage() {
  const admin = await requireRole("admin");
  const { awaitingAdmin, awaitingTarget, history } = await swapsForAdmin();
  const warnings = new Map(
    await Promise.all(awaitingAdmin.map(async (swap) => [swap.id, await swapPreviewWarnings(swap.id)] as const)),
  );

  return (
    <>
      <PageHeader
        title="Persetujuan Tukar"
        description="Cukup satu admin atau superadmin yang menyetujui. Saat disetujui, kursi kedua staf langsung ditukar di roster."
      />

      <div className="grid gap-8">
        <section aria-labelledby="awaiting-admin" className="grid gap-3">
          <h2 id="awaiting-admin" className="text-base font-semibold">
            Menunggu persetujuan
          </h2>
          {awaitingAdmin.length === 0 ? (
            <EmptyState icon={CheckCheck} title="Tidak ada yang menunggu" description="Permintaan muncul di sini setelah rekan yang diminta menerima." />
          ) : (
            awaitingAdmin.map((swap) => (
              <SwapCard key={swap.id} swap={swap} viewerId={admin.id}>
                {(warnings.get(swap.id) ?? []).length > 0 && (
                  <ul className="grid gap-1 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                    {warnings.get(swap.id)!.map((warning) => (
                      <li key={warning} className="flex items-start gap-2">
                        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-brand-text" aria-hidden="true" />
                        Setelah ditukar: {warning}
                      </li>
                    ))}
                  </ul>
                )}
                <DecideButtons requestId={swap.id} canApprove />
              </SwapCard>
            ))
          )}
        </section>

        {awaitingTarget.length > 0 && (
          <section aria-labelledby="awaiting-target" className="grid gap-3">
            <h2 id="awaiting-target" className="text-base font-semibold">
              Menunggu jawaban rekan
            </h2>
            {awaitingTarget.map((swap) => (
              <SwapCard key={swap.id} swap={swap} viewerId={admin.id}>
                <DecideButtons requestId={swap.id} canApprove={false} />
              </SwapCard>
            ))}
          </section>
        )}

        {history.length > 0 && (
          <section aria-labelledby="history" className="grid gap-3">
            <h2 id="history" className="text-base font-semibold">
              Riwayat
            </h2>
            {history.map((swap) => (
              <SwapCard key={swap.id} swap={swap} viewerId={admin.id} />
            ))}
          </section>
        )}
      </div>
    </>
  );
}
