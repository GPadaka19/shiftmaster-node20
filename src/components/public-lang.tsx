"use client";

import { useSyncExternalStore } from "react";
import { cn } from "cn";
import {
  PUBLIC_LANG_CHANGE_EVENT,
  PUBLIC_LANG_SCRIPT,
  PUBLIC_LANG_STORAGE_KEY,
  type PublicLang,
} from "@/lib/public-lang";

/** Picks the language before first paint (see ThemeScript for the script trick). */
export function PublicLangScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: PUBLIC_LANG_SCRIPT }}
    />
  );
}

function subscribe(onChange: () => void) {
  window.addEventListener(PUBLIC_LANG_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(PUBLIC_LANG_CHANGE_EVENT, onChange);
}

function readLang(): PublicLang {
  return document.documentElement.getAttribute("data-public-lang") === "en" ? "en" : "id";
}

function choose(lang: PublicLang) {
  document.documentElement.setAttribute("data-public-lang", lang);
  try {
    localStorage.setItem(PUBLIC_LANG_STORAGE_KEY, lang);
  } catch {
    // Storage blocked (private mode): the choice lasts until the page is reloaded.
  }
  // An #english anchor would switch back to English on the next reload.
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  window.scrollTo({ top: 0 });
  window.dispatchEvent(new Event(PUBLIC_LANG_CHANGE_EVENT));
}

const OPTIONS: { value: PublicLang; label: string; name: string }[] = [
  { value: "id", label: "ID", name: "Bahasa Indonesia" },
  { value: "en", label: "EN", name: "English" },
];

/** The ID / EN switch in the public header. */
export function PublicLangSwitch() {
  const lang = useSyncExternalStore(subscribe, readLang, () => "id" as const);

  return (
    <div role="radiogroup" aria-label="Bahasa / Language" className="inline-flex rounded-lg border border-border bg-muted p-0.5">
      {OPTIONS.map(({ value, label, name }) => {
        const selected = lang === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={name}
            lang={value}
            onClick={() => choose(value)}
            className={cn(
              "h-9 rounded-md border px-3 text-sm font-medium",
              selected ? "border-border bg-card text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
