import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Optimistic check only: sends visitors without a session cookie to /masuk.
 * Whether the session is actually valid is checked against the database in
 * every page and Server Action (see lib/auth/session.ts).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/masuk" || request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const url = new URL("/masuk", request.url);
  if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|robots.txt).*)"],
};
