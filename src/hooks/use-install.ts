import { useSyncExternalStore } from "react";
import {
  INSTALL_DISMISSALS_STORAGE_KEY,
  parseDismissals,
  recordDismissal,
  type InstallDismissals,
  type InstallStatus,
} from "@/lib/pwa/install-rules";
import { INSTALL_CHANGE_EVENT } from "@/lib/pwa/install-script";

const STANDALONE_QUERY = "(display-mode: standalone)";

function subscribe(onChange: () => void) {
  const standalone = window.matchMedia(STANDALONE_QUERY);
  window.addEventListener(INSTALL_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  standalone.addEventListener("change", onChange);
  return () => {
    window.removeEventListener(INSTALL_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
    standalone.removeEventListener("change", onChange);
  };
}

function isIos(): boolean {
  // iPadOS reports itself as a Mac; the touch points give it away.
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function readStatus(): InstallStatus {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (window.__installed || iosStandalone || window.matchMedia(STANDALONE_QUERY).matches) return "installed";
  if (window.__installPrompt) return "available";
  return isIos() ? "ios" : "manual";
}

function readDismissalsRaw(): string {
  try {
    return localStorage.getItem(INSTALL_DISMISSALS_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Opens the browser's install dialog. Resolves to what the member chose, or null when there was no dialog to open. */
async function install(): Promise<"accepted" | "dismissed" | null> {
  const prompt = window.__installPrompt;
  if (!prompt) return null;
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  // A prompt can be used once; the browser sends a new one if it offers again.
  window.__installPrompt = null;
  window.dispatchEvent(new Event(INSTALL_CHANGE_EVENT));
  return outcome;
}

function dismiss() {
  try {
    const next = recordDismissal(parseDismissals(readDismissalsRaw()), Date.now());
    localStorage.setItem(INSTALL_DISMISSALS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked (private mode): the card comes back on the next visit.
  }
  window.dispatchEvent(new Event(INSTALL_CHANGE_EVENT));
}

/**
 * Whether Shift Master can be installed here, shared by the floating card and
 * the account page button. The server and the first client render see
 * "unknown", so both render the same HTML.
 */
export function useInstall(): {
  status: InstallStatus;
  dismissals: InstallDismissals;
  install: typeof install;
  dismiss: typeof dismiss;
} {
  const status = useSyncExternalStore(subscribe, readStatus, () => "unknown" as const);
  const dismissalsRaw = useSyncExternalStore(subscribe, readDismissalsRaw, () => "");
  return { status, dismissals: parseDismissals(dismissalsRaw), install, dismiss };
}
