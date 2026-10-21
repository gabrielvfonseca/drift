import { describe, expectTypeOf, it } from "vitest";
import { isStale, type Run, type Scope, type ScopeMode, StaleError, scope } from "../src/index.js";

// These assertions are verified by `tsc` (see the typecheck script). The runtime body is a smoke test.
describe("public types", () => {
  it("scope() returns a Scope with the documented members", () => {
    const s = scope();
    expectTypeOf(s).toEqualTypeOf<Scope>();
    expectTypeOf(s.run).returns.toEqualTypeOf<Run>();
    expectTypeOf(s.invalidate).parameter(0).toEqualTypeOf<unknown>();
    expectTypeOf(s.signal).toEqualTypeOf<AbortSignal>();
    expectTypeOf(s.disposed).toEqualTypeOf<boolean>();
  });

  it("guard preserves the resolved type, including through PromiseLike", () => {
    const run = scope().run();
    expectTypeOf(run.guard(Promise.resolve(1))).resolves.toEqualTypeOf<number>();
    expectTypeOf(run.guard(2)).resolves.toEqualTypeOf<number>();
    expectTypeOf(run.guard(Promise.resolve("a" as const))).resolves.toEqualTypeOf<"a">();
  });

  it("commit takes a void callback and returns a boolean", () => {
    const run = scope().run();
    expectTypeOf(run.commit).parameter(0).toEqualTypeOf<() => void>();
    expectTypeOf(run.commit).returns.toEqualTypeOf<boolean>();
  });

  it("isStale narrows to StaleError", () => {
    const value: unknown = new StaleError("x");
    if (isStale(value)) {
      expectTypeOf(value).toEqualTypeOf<StaleError>();
    }
  });

  it("ScopeMode is limited to the two supported modes", () => {
    expectTypeOf<ScopeMode>().toEqualTypeOf<"latest" | "concurrent">();
  });
});
