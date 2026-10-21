import type { Scope } from "@drift/after";
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { useScope } from "../src/index.js";
import { renderHookWith } from "./render-hook.js";

const mounted: Array<() => void> = [];
afterEach(() => {
  while (mounted.length > 0) mounted.pop()?.();
});

function mount<T>(hook: () => T, strict = false) {
  const rendered = renderHookWith(hook, { strict });
  mounted.push(rendered.unmount);
  return rendered;
}

describe("useScope", () => {
  it("returns the same object across re-renders", () => {
    const { result, rerender } = mount(() => useScope());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it("hands out valid runs while mounted", () => {
    const { result } = mount(() => useScope());
    expect(result.current.run().valid).toBe(true);
    expect(result.current.disposed).toBe(false);
  });

  it("disposes on unmount, invalidating outstanding and future runs", () => {
    const { result, unmount } = mount(() => useScope());
    const scope: Scope = result.current;
    const pending = scope.run();
    const signal = scope.signal;

    unmount();

    expect(pending.valid).toBe(false);
    expect(signal.aborted).toBe(true);
    expect(scope.disposed).toBe(true);
    expect(scope.run().valid).toBe(false);
  });

  it("keeps a usable scope through StrictMode's mount, unmount, remount cycle", () => {
    const { result } = mount(() => useScope(), true);
    expect(result.current.disposed).toBe(false);
    expect(result.current.run().valid).toBe(true);
  });

  it("still disposes on real unmount under StrictMode", () => {
    const { result, unmount } = mount(() => useScope(), true);
    const pending = result.current.run();
    unmount();
    expect(pending.valid).toBe(false);
  });

  it("prevents a late response from committing after unmount", async () => {
    const commits: string[] = [];
    const { result, unmount } = mount(() => useScope());

    const load = async (): Promise<void> => {
      const run = result.current.run();
      const data = await run.guard(new Promise<string>((r) => setTimeout(() => r("profile"), 5)));
      run.commit(() => commits.push(data));
    };

    const inFlight = load().catch(() => undefined);
    unmount();
    await act(async () => {
      await inFlight;
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(commits).toEqual([]);
  });

  it("forwards options such as concurrent mode", () => {
    const { result } = mount(() => useScope({ mode: "concurrent" }));
    const a = result.current.run();
    const b = result.current.run();
    expect(a.valid && b.valid).toBe(true);
  });

  it("supersedes earlier runs in the default latest mode", () => {
    const { result } = mount(() => useScope());
    const first = result.current.run();
    const second = result.current.run();
    expect(first.valid).toBe(false);
    expect(second.valid).toBe(true);
  });

  it("exposes invalidate, dispose and signal on the returned handle", () => {
    const { result } = mount(() => useScope());
    const scope = result.current;

    const first = scope.run();
    const period = scope.signal;
    scope.invalidate("route changed");
    expect(first.valid).toBe(false);
    expect(period.reason).toBe("route changed");
    expect(scope.run().valid).toBe(true);

    scope.dispose();
    expect(scope.disposed).toBe(true);
    expect(scope.signal.aborted).toBe(true);
  });
});
