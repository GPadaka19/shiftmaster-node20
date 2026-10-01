"use client";

import { useLayoutEffect } from "react";
import { THEME_SCRIPT } from "@/lib/theme";

/**
 * Applies the theme before first paint on full page loads (see
 * node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md).
 *
 * The script is executable only in the server HTML. On the client it renders as
 * text/plain, so React doesn't warn about rendering a <script> it can't run.
 */
export function ThemeScript() {
  // If React re-renders the root on the client (dev Strict Mode remount, hydration
  // recovery), it resets <html> to data-theme="light". Re-apply before paint.
  useLayoutEffect(() => {
    window.__applyTheme?.();
  }, []);

  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
    />
  );
}
