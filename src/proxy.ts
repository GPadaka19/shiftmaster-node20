import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/** Pages anyone may open without signing in. */
const PUBLIC_PATHS = new Set(["/login", "/about", "/privacy", "/terms"]);

/**
 * Optimistic check only. Visitors without a session cookie get the public home
 * page at "/" (a rewrite to /about) and are sent to /login everywhere else.
 * Whether the session is actually valid is checked against the database in
 * every page and Server Action (see lib/auth/session.ts).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname) || request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  if (pathname === "/") {
    // The installed app opens "/?source=pwa" (manifest.ts): skip the home page.
    if (request.nextUrl.searchParams.get("source") === "pwa") return NextResponse.redirect(new URL("/login", request.url));
    // A rewrite, not a redirect, so the address itself answers without a login.
    return NextResponse.rewrite(new URL("/about", request.url));
  }

  const url = new URL("/login", request.url);
  url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|brand/|manifest.webmanifest|robots.txt|sw.js|offline.html).*)"],
};
