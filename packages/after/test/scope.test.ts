import { describe, expect, it, vi } from "vitest";
import { isStale, type Run, type Scope, StaleError, scope } from "../src/index.js";

describe("latest mode (default)", () => {
  it("supersedes the previous run and keeps only the newest valid", () => {
    const s = scope();
    const first = s.run();
    const second = s.run();

    expect(first.valid).toBe(false);
    expect(second.valid).toBe(true);
    expect(first.signal.aborted).toBe(true);
    expect(second.signal.aborted).toBe(false);
  });

  it("commit runs only for the valid run", () => {
    const s = scope();
    const stale = s.run();
    const fresh = s.run();
    const renderStale = vi.fn();
    const renderFresh = vi.fn();

    expect(stale.commit(renderStale)).toBe(false);
    expect(fresh.commit(renderFresh)).toBe(true);
    expect(renderStale).not.toHaveBeenCalled();
    expect(renderFresh).toHaveBeenCalledOnce();
  });

  it("does not abort scope.signal when a run is superseded", () => {
    const s = scope();
    s.run();
    s.run();
    expect(s.signal.aborted).toBe(false);
  });
});

describe("concurrent mode", () => {
  it("keeps all runs valid until invalidate()", () => {
    const s = scope({ mode: "concurrent" });
    const period = s.signal;
    const a = s.run();
    const b = s.run();
    expect(a.valid && b.valid).toBe(true);

    s.invalidate("navigated");
    expect(a.valid).toBe(false);
    expect(b.valid).toBe(false);
    expect(period.aborted).toBe(true);
    expect(period.reason).toBe("navigated");
  });

  it("issues fresh runs after invalidate, so the scope stays usable", () => {
    const s = scope({ mode: "concurrent" });
    const before = s.run();
    s.invalidate();
    const after = s.run();

    expect(before.valid).toBe(false);
    expect(after.valid).toBe(true);
    expect(s.signal.aborted).toBe(false);
  });
});

describe("invalidate()", () => {
  it("invalidates the current latest run and leaves the scope reusable", () => {
    const s = scope();
    const run = s.run();
    s.invalidate();

    expect(run.valid).toBe(false);
    expect(s.run().valid).toBe(true);
  });

  it("is safe to call repeatedly and when nothing is running", () => {
    const s = scope();
    expect(() => {
      s.invalidate();
      s.invalidate();
    }).not.toThrow();
  });

  it("invalidating during commit: the commit already in progress still completes", () => {
    const s = scope({ mode: "concurrent" });
    const run = s.run();
    const order: string[] = [];

    const ran = run.commit(() => {
      order.push("body");
      s.invalidate();
      order.push("after-invalidate");
    });

    expect(ran).toBe(true);
    expect(order).toEqual(["body", "after-invalidate"]);
    expect(run.commit(() => order.push("late"))).toBe(false);
  });

  it("propagates errors thrown by a commit body", () => {
    const run = scope().run();
    expect(() =>
      run.commit(() => {
        throw new Error("render failed");
      }),
    ).toThrow("render failed");
  });
});

describe("dispose()", () => {
  it("permanently closes the scope and returns invalid runs afterwards", () => {
    const s = scope();
    const live = s.run();
    s.dispose();

    expect(live.valid).toBe(false);
    expect(s.disposed).toBe(true);
    expect(s.run().valid).toBe(false);
    expect(s.signal.aborted).toBe(true);
  });

  it("is idempotent and ignores later invalidate() calls", () => {
    const s = scope();
    s.dispose();
    expect(() => {
      s.dispose();
      s.invalidate();
    }).not.toThrow();
    expect(s.disposed).toBe(true);
  });
});

describe("nested scopes", () => {
  it("invalidates the child when the parent is invalidated", () => {
    const parent = scope({ mode: "concurrent" });
    const child = scope({ parent, mode: "concurrent" });
    const run = child.run();

    parent.invalidate();
    expect(run.valid).toBe(false);
    expect(child.run().valid).toBe(true);
  });

  it("disposing the parent disposes its children's current and future runs", () => {
    const parent = scope();
    const child = scope({ parent });
    const run = child.run();

    parent.dispose();
    expect(run.valid).toBe(false);
    expect(child.run().valid).toBe(false);
  });

  it("superseding a parent run does not invalidate the child", () => {
    const parent = scope();
    const child = scope({ parent, mode: "concurrent" });
    const childRun = child.run();

    parent.run();
    parent.run();
    expect(childRun.valid).toBe(true);
  });

  it("invalidating the child does not affect the parent", () => {
    const parent = scope({ mode: "concurrent" });
    const child = scope({ parent, mode: "concurrent" });
    const parentRun = parent.run();

    child.invalidate();
    expect(parentRun.valid).toBe(true);
  });

  it("rejects a parent that was not created by scope()", () => {
    const fake = { run: () => null } as unknown as Scope;
    expect(() => scope({ parent: fake })).toThrow(TypeError);
  });
});

describe("run.signal", () => {
  it("aborts when the run is invalidated and carries the reason", () => {
    const s = scope({ mode: "concurrent" });
    const run = s.run();
    s.invalidate("unmounted");
    expect(run.signal.aborted).toBe(true);
    expect(run.signal.reason).toBe("unmounted");
  });

  it("can be passed to fetch-style APIs to cancel the request itself", async () => {
    const s = scope();
    const run = s.run();
    const seen = new Promise<unknown>((resolve) => {
      run.signal.addEventListener("abort", () => resolve(run.signal.reason));
    });
    s.run();
    await expect(seen).resolves.toBe("superseded");
  });
});

describe("run.guard()", () => {
  it("resolves with the value when the run is still valid", async () => {
    const run = scope().run();
    await expect(run.guard(Promise.resolve(42))).resolves.toBe(42);
    await expect(run.guard(7)).resolves.toBe(7);
  });

  it("rejects with StaleError if the run became invalid while awaiting", async () => {
    const s = scope();
    const run = s.run();
    const pending = run.guard(new Promise((resolve) => setTimeout(() => resolve("data"), 5)));
    s.run();

    const error = await pending.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(StaleError);
    expect(isStale(error)).toBe(true);
    expect((error as StaleError).reason).toBe("superseded");
  });

  it("reports a rejection after invalidation as StaleError, keeping the original as cause", async () => {
    const s = scope();
    const run = s.run();
    const cause = new Error("network down");
    const pending = run.guard(Promise.reject(cause));
    s.invalidate();

    const error = await pending.catch((e: unknown) => e);
    expect(isStale(error)).toBe(true);
    expect((error as StaleError).cause).toBe(cause);
  });

  it("rethrows the original error when the run is still valid", async () => {
    const run = scope().run();
    const cause = new Error("boom");
    await expect(run.guard(Promise.reject(cause))).rejects.toBe(cause);
  });

  it("lets code after an await stop without manual checks", async () => {
    const s = scope({ mode: "concurrent" });
    const run = s.run();
    const commitSpy = vi.fn();

    const load = async (): Promise<void> => {
      const data = await run.guard(Promise.resolve("profile-a"));
      await run.guard(Promise.resolve(undefined));
      run.commit(() => commitSpy(data));
    };

    s.invalidate();
    await expect(load()).rejects.toBeInstanceOf(StaleError);
    expect(commitSpy).not.toHaveBeenCalled();
  });
});

describe("run.assertValid()", () => {
  it("throws StaleError only once the run is invalid", () => {
    const s = scope();
    const run = s.run();
    expect(() => run.assertValid()).not.toThrow();
    s.invalidate("left page");
    expect(() => run.assertValid()).toThrow(StaleError);
  });
});

describe("differential: matches a reference model over random operation sequences", () => {
  type Op =
    | { time: number; kind: "start"; id: number }
    | { time: number; kind: "invalidate" }
    | { time: number; kind: "settle"; id: number };

  it.each([1, 2, 3, 42, 1337])("seed %i", async (seed) => {
    const { seeded } = await import("./helpers.js");
    const rand = seeded(seed);

    // Build a timeline: runs start at random times and settle later. Ties keep insertion
    // order (start before its own settle), since Array.prototype.sort is stable.
    const ops: Op[] = [];
    let nextId = 0;
    for (let i = 0; i < 400; i++) {
      const time = Math.floor(rand() * 200);
      if (rand() < 0.5) {
        const id = nextId++;
        ops.push({ time, kind: "start", id });
        ops.push({ time: time + Math.floor(rand() * 50), kind: "settle", id });
      } else {
        ops.push({ time, kind: "invalidate" });
      }
    }
    ops.sort((a, b) => a.time - b.time);

    const s = scope();
    const runs = new Map<number, { run: Run; startSeq: number }>();
    let seq = 0;
    // Reference model: a run is valid iff no run started after it and no invalidate
    // happened after it started.
    let lastRunSeq = -1;
    let lastInvalidateSeq = -1;
    const expected: number[] = [];
    const actual: number[] = [];

    for (const op of ops) {
      seq++;
      if (op.kind === "start") {
        runs.set(op.id, { run: s.run(), startSeq: seq });
        lastRunSeq = seq;
      } else if (op.kind === "invalidate") {
        s.invalidate();
        lastInvalidateSeq = seq;
      } else {
        const entry = runs.get(op.id);
        if (!entry) throw new Error("settle before start");
        const referenceValid = lastRunSeq === entry.startSeq && lastInvalidateSeq < entry.startSeq;
        expect(entry.run.valid).toBe(referenceValid);
        const ran = entry.run.commit(() => {
          actual.push(op.id);
        });
        expect(ran).toBe(referenceValid);
        if (referenceValid) expected.push(op.id);
      }
    }

    expect(actual).toEqual(expected);
    expect(actual.length).toBeGreaterThan(0);
  });
});
