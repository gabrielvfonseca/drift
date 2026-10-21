import { getEventListeners } from "node:events";
import { describe, expect, it } from "vitest";
import { scope } from "../src/index.js";

// Listeners are attached to the parent's/own abort signal. These checks make sure churning runs
// and child scopes detach their listeners instead of accumulating them.
describe("listener hygiene", () => {
  it("latest mode keeps a single listener on the scope lifetime after many superseded runs", () => {
    const s = scope();
    for (let i = 0; i < 5000; i++) s.run();
    expect(getEventListeners(s.signal, "abort")).toHaveLength(1);
  });

  it("concurrent mode adds no per-run listeners", () => {
    const s = scope({ mode: "concurrent" });
    for (let i = 0; i < 5000; i++) s.run();
    expect(getEventListeners(s.signal, "abort")).toHaveLength(0);
  });

  it("a child scope that churns does not accumulate listeners on the parent", () => {
    const parent = scope();
    const child = scope({ parent });
    let peak = 0;
    for (let i = 0; i < 5000; i++) {
      child.run();
      peak = Math.max(peak, getEventListeners(parent.signal, "abort").length);
      child.invalidate();
    }
    expect(peak).toBe(1);
    expect(getEventListeners(parent.signal, "abort")).toHaveLength(0);
  });

  it("disposed children release their parent link", () => {
    const parent = scope();
    for (let i = 0; i < 1000; i++) {
      const child = scope({ parent });
      child.run();
      child.dispose();
    }
    expect(getEventListeners(parent.signal, "abort")).toHaveLength(0);
  });
});
