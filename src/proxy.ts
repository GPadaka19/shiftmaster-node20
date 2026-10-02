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

  // A rewrite, not a redirect, so the address itself answers without a login.
  if (pathname === "/") return NextResponse.rewrite(new URL("/about", request.url));

  const url = new URL("/login", request.url);
  url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|brand/|manifest.webmanifest|robots.txt).*)"],
};
