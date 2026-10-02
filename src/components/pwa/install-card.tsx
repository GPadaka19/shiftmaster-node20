"use client";

import { Download, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useInstall } from "@/hooks/use-install";
import { INSTALL_CARD_DELAY_MS, shouldShowInstallCard } from "@/lib/pwa/install-rules";

/**
 * The floating invitation to install the app. When it appears and how long it
 * stays away after being closed is decided in lib/pwa/install-rules.ts.
 */
export function InstallCard() {
  const pathname = usePathname();
  const { status, dismissals, install, dismiss } = useInstall();
  // Null until the delay has passed; then the moment the rules are checked against.
  const [readyAt, setReadyAt] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setReadyAt(Date.now()), INSTALL_CARD_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (readyAt === null || !shouldShowInstallCard({ status, pathname, dismissals, now: readyAt })) return null;

  return (
    <>
      {/* Keeps the end of the page reachable above the card on phones. */}
      <div aria-hidden="true" className="h-32 lg:hidden" />
      <section
        aria-labelledby="install-card-title"
        className="fixed inset-x-4 bottom-20 z-40 mx-auto max-w-md animate-in rounded-lg border border-border bg-card p-4 text-sm text-card-foreground shadow-md duration-150 fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none lg:inset-x-auto lg:right-8 lg:bottom-8 lg:mx-0 lg:w-96"
      >
        <div className="flex items-start gap-3">
          <BrandMark className="size-10 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">
            <h2 id="install-card-title" className="font-medium">
              Pasang Shift Master
            </h2>
            <p className="mt-0.5 text-muted-foreground">Buka lebih cepat dari layar utama, tanpa mengetik alamat.</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Tutup"
            title="Tutup"
            data-track="Tutup kartu pasang"
            className="-mt-2 -mr-2 size-11 text-muted-foreground"
            onClick={dismiss}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
        <div className="mt-3 flex gap-2">
          {status === "available" ? (
            <Button type="button" data-track="Pasang (kartu)" className="h-11 flex-1" onClick={() => void install()}>
              <Download aria-hidden="true" />
              Pasang
            </Button>
          ) : (
            <Button asChild className="h-11 flex-1">
              <Link href="/account#install" data-track="Lihat cara pasang (kartu)">
                Lihat caranya
              </Link>
            </Button>
          )}
          <Button type="button" variant="ghost" data-track="Nanti saja (kartu pasang)" className="h-11 px-4" onClick={dismiss}>
            Nanti saja
          </Button>
        </div>
      </section>
    </>
  );
}
