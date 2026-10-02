import { ACTIVITY_LABEL_MAX, ACTIVITY_PATH_MAX } from "./constants";

// Pure helpers shared by the browser tracker and the server, so both agree on
// what an event may contain.

/** "/admin/members/12?tab=pin" → "/admin/members/[id]": no query, no record ids. */
export function normalizePath(path: string): string {
  const pathname = path.split(/[?#]/)[0] || "/";
  const cleaned = pathname
    .split("/")
    .map((segment) => (/^\d+$/.test(segment) ? "[id]" : segment))
    .join("/");
  return cleaned.slice(0, ACTIVITY_PATH_MAX);
}

/** One line, collapsed spaces, at most ACTIVITY_LABEL_MAX characters. */
export function cleanLabel(text: string): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length > ACTIVITY_LABEL_MAX ? `${collapsed.slice(0, ACTIVITY_LABEL_MAX - 1)}…` : collapsed;
}
