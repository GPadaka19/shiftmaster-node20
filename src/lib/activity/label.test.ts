import { describe, expect, it } from "vitest";
import { ACTIVITY_LABEL_MAX } from "./constants";
import { cleanLabel, normalizePath } from "./label";

describe("normalizePath", () => {
  it("drops the query and hash", () => {
    expect(normalizePath("/roster?week=2026-10-05&view=table")).toBe("/roster");
    expect(normalizePath("/privacy#english")).toBe("/privacy");
  });

  it("replaces record ids", () => {
    expect(normalizePath("/admin/members/12")).toBe("/admin/members/[id]");
    expect(normalizePath("/admin/members/new")).toBe("/admin/members/new");
  });

  it("keeps the home page", () => {
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath("?x=1")).toBe("/");
  });
});

describe("cleanLabel", () => {
  it("collapses whitespace", () => {
    expect(cleanLabel("  Kirim \n  permintaan ")).toBe("Kirim permintaan");
  });

  it("caps the length", () => {
    const label = cleanLabel("a".repeat(200));
    expect(label).toHaveLength(ACTIVITY_LABEL_MAX);
    expect(label.endsWith("…")).toBe(true);
  });
});
