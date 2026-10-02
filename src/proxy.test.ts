import { NextRequest, type NextResponse } from "next/server";
import { getRedirectUrl, getRewrittenUrl, isRewrite, unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { config, proxy } from "./proxy";

const ORIGIN = "https://sm.example";

function visit(path: string, { signedIn = false } = {}) {
  const request = new NextRequest(`${ORIGIN}${path}`);
  if (signedIn) request.cookies.set(SESSION_COOKIE, "token");
  return proxy(request);
}

/** True when the request goes on to the page it asked for. */
function passesThrough(response: NextResponse): boolean {
  return !isRewrite(response) && getRedirectUrl(response) === null;
}

describe("proxy", () => {
  it("serves the public home page at / without redirecting", () => {
    const response = visit("/");
    expect(isRewrite(response)).toBe(true);
    expect(getRewrittenUrl(response)).toBe(`${ORIGIN}/about`);
    expect(getRedirectUrl(response)).toBeNull();
  });

  it("sends a signed-out launch of the installed app to the sign-in form", () => {
    expect(getRedirectUrl(visit("/?source=pwa"))).toBe(`${ORIGIN}/login`);
    expect(passesThrough(visit("/?source=pwa", { signedIn: true }))).toBe(true);
  });

  it("lets a signed-in member through to Hari Ini at /", () => {
    expect(passesThrough(visit("/", { signedIn: true }))).toBe(true);
  });

  it.each(["/login", "/about", "/privacy", "/terms"])("leaves %s open to visitors", (path) => {
    expect(passesThrough(visit(path))).toBe(true);
  });

  it("sends visitors to /login and remembers where they were going", () => {
    expect(getRedirectUrl(visit("/roster?week=2026-10-05"))).toBe(`${ORIGIN}/login?next=%2Froster%3Fweek%3D2026-10-05`);
    expect(getRedirectUrl(visit("/admin/members"))).toBe(`${ORIGIN}/login?next=%2Fadmin%2Fmembers`);
  });

  it("does not treat paths that merely start with a public path as public", () => {
    expect(getRedirectUrl(visit("/privacy-export"))).toBe(`${ORIGIN}/login?next=%2Fprivacy-export`);
    expect(getRedirectUrl(visit("/about/team"))).toBe(`${ORIGIN}/login?next=%2Fabout%2Fteam`);
  });

  it("skips static files, the API and robots.txt", () => {
    const matches = (url: string) => unstable_doesMiddlewareMatch({ config, url });
    expect(matches("/")).toBe(true);
    expect(matches("/roster")).toBe(true);
    expect(matches("/robots.txt")).toBe(false);
    expect(matches("/sw.js")).toBe(false);
    expect(matches("/offline.html")).toBe(false);
    expect(matches("/api/health")).toBe(false);
    expect(matches("/brand/logo-96.png")).toBe(false);
    expect(matches("/_next/static/chunk.js")).toBe(false);
  });
});
