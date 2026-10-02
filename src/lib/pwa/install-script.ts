export type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export const INSTALL_CHANGE_EVENT = "installchange";

declare global {
  interface Window {
    /** The browser's install dialog, held until the member asks for it. Set by INSTALL_SCRIPT. */
    __installPrompt?: BeforeInstallPromptEvent | null;
    /** True once the app was installed during this visit. */
    __installed?: boolean;
  }
}

/**
 * Runs in <head>: registers the service worker and catches the browser's
 * install offer, which can fire before React has hydrated.
 */
export const INSTALL_SCRIPT = `(function(){try{
var changed=function(){window.dispatchEvent(new Event(${JSON.stringify(INSTALL_CHANGE_EVENT)}))};
window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__installPrompt=e;changed()});
window.addEventListener("appinstalled",function(){window.__installPrompt=null;window.__installed=true;changed()});
if("serviceWorker" in navigator)window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})});
}catch(e){}})()`;
