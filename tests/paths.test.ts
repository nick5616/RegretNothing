import { describe, expect, it } from "vitest";
import { bookmarklet } from "@/components/StoreButton";
import { localPath } from "@/lib/paths";

describe("localPath", () => {
  it("keeps same-site paths and refuses everything else", () => {
    expect(localPath("/add?url=https%3A%2F%2Fetsy.com")).toBe("/add?url=https%3A%2F%2Fetsy.com");
    expect(localPath("//evil.com")).toBe("/me");
    expect(localPath("/\\evil.com")).toBe("/me");
    expect(localPath("https://evil.com")).toBe("/me");
    expect(localPath(undefined)).toBe("/me");
  });
});

describe("store button", () => {
  it("compiles to a single line of valid JavaScript aimed at our site", () => {
    const href = bookmarklet("https://regretnothing.netlify.app");
    expect(href.startsWith("javascript:")).toBe(true);
    const code = decodeURIComponent(href.slice("javascript:".length));
    expect(code).not.toContain("\n");
    expect(code).toContain('"https://regretnothing.netlify.app"+\'/add?\'');
    expect(() => new Function(code)).not.toThrow();
  });
});
