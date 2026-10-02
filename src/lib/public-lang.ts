export type PublicLang = "id" | "en";

export const PUBLIC_LANG_STORAGE_KEY = "public-lang";
export const PUBLIC_LANG_CHANGE_EVENT = "publiclangchange";

/**
 * The public pages (home, privacy policy, terms) carry both languages in their
 * HTML, so Google's checker reads both, and globals.css hides the one not
 * chosen. Runs before first paint: a link to #english or an "-en" anchor opens
 * the English version, otherwise the saved choice, otherwise Indonesian.
 */
export const PUBLIC_LANG_SCRIPT = `(function(){try{
var h=location.hash,l=h==="#english"||/-en$/.test(h)?"en":localStorage.getItem(${JSON.stringify(PUBLIC_LANG_STORAGE_KEY)});
document.documentElement.setAttribute("data-public-lang",l==="en"?"en":"id");
}catch(e){}})()`;
