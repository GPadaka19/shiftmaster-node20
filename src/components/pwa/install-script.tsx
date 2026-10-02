"use client";

import { INSTALL_SCRIPT } from "@/lib/pwa/install-script";

/** Registers the service worker and keeps the browser's install offer (see ThemeScript for the script trick). */
export function InstallScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: INSTALL_SCRIPT }}
    />
  );
}
