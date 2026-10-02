"use client";

import { CircleCheck, Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useInstall } from "@/hooks/use-install";

const IOS_STEPS = ["Ketuk tombol Bagikan di Safari.", "Pilih “Tambah ke Layar Utama”.", "Ketuk “Tambah”."];
const MANUAL_STEPS = [
  "Buka menu browser (ikon titik tiga).",
  "Pilih “Instal aplikasi” atau “Tambahkan ke Layar utama”.",
  "Kalau pilihan itu tidak ada, buka Shift Master di Chrome.",
];

/** The install button on the account page. Always there; what a press does depends on the browser. */
export function InstallButton() {
  const { status, install } = useInstall();
  const [showSteps, setShowSteps] = useState(false);
  const [pending, setPending] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const installed = status === "installed";
  const hasDialog = status === "available";

  async function onPress() {
    if (!hasDialog) {
      setShowSteps((open) => !open);
      return;
    }
    setPending(true);
    setCancelled(false);
    try {
      setCancelled((await install()) === "dismissed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-3">
      <Button
        type="button"
        data-track="Pasang aplikasi (akun)"
        className="h-11 justify-self-start px-4"
        disabled={installed || pending}
        aria-expanded={hasDialog || installed ? undefined : showSteps}
        onClick={() => void onPress()}
      >
        {installed ? <CircleCheck aria-hidden="true" /> : <Download aria-hidden="true" />}
        {installed ? "Sudah terpasang" : pending ? "Memasang…" : "Pasang aplikasi"}
      </Button>

      {installed && <p className="text-sm text-muted-foreground">Shift Master sudah terpasang di perangkat ini.</p>}
      {cancelled && !installed && (
        <p aria-live="polite" className="text-sm text-muted-foreground">
          Pemasangan dibatalkan. Kamu bisa mencobanya lagi kapan saja.
        </p>
      )}

      {showSteps && !hasDialog && !installed && (
        <div className="grid gap-1.5 text-sm text-muted-foreground">
          <p>{status === "ios" ? "Di iPhone atau iPad, pasang lewat menu Bagikan:" : "Browser ini tidak menyediakan tombol pasang. Coba lewat menu browser:"}</p>
          <ol className="grid list-decimal gap-1 pl-5">
            {(status === "ios" ? IOS_STEPS : MANUAL_STEPS).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
