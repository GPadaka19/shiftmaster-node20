/**
 * Where to go after signing in. Only same-site paths are allowed, so a crafted
 * `?next=https://evil.example` link cannot bounce users off the app.
 */
export function safeNextPath(next: unknown): string {
  if (typeof next !== "string") return "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (next.startsWith("/masuk")) return "/";
  return next;
}
