import { describe, expect, it } from "vitest";
import { isStale, StaleError, scope } from "../src/index.js";

describe("isStale", () => {
  it("recognizes StaleError from this copy of the package", () => {
    expect(isStale(new StaleError("x"))).toBe(true);
  });

  it("recognizes a StaleError from a duplicate copy via the shared brand", () => {
    const foreign = { [Symbol.for("@drift/after/StaleError")]: true, message: "stale" };
    expect(isStale(foreign)).toBe(true);
  });

  it("rejects ordinary errors, primitives and nullish values", () => {
    expect(isStale(new Error("boom"))).toBe(false);
    expect(isStale("stale")).toBe(false);
    expect(isStale(null)).toBe(false);
    expect(isStale(undefined)).toBe(false);
  });

  it("is produced by real invalidations", async () => {
    const s = scope();
    const run = s.run();
    s.invalidate();
    const error = await run.guard(Promise.resolve(1)).catch((e: unknown) => e);
    expect(isStale(error)).toBe(true);
  });
});
