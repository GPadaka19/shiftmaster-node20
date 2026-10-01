export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "theme";

declare global {
  interface Window {
    /** Defined by THEME_SCRIPT (rendered by ThemeScript in the root layout). */
    __applyTheme?: () => void;
  }
}

/**
 * Runs in <head> before first paint: applies the saved preference (or the OS
 * setting for "system") as data-theme, and follows OS changes while on "system".
 */
export const THEME_SCRIPT = `(function(){try{
var k=${JSON.stringify(THEME_STORAGE_KEY)},m=window.matchMedia("(prefers-color-scheme: dark)");
function apply(){var p=localStorage.getItem(k)||"system";var t=p==="system"?(m.matches?"dark":"light"):p;document.documentElement.setAttribute("data-theme",t);}
apply();m.addEventListener("change",apply);window.__applyTheme=apply;
}catch(e){}})()`;
