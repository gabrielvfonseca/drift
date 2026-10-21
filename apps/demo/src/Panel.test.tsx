import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Panel } from "./Panel.js";

const base = { title: "T", tone: "good" as const, onQuery: () => {}, staleNote: "NOTE" };

describe("Panel stale detection", () => {
  it("does not flag a result whose query matches the input exactly, including trailing spaces", () => {
    const html = renderToStaticMarkup(
      <Panel {...base} query="cat " shown={{ query: "cat ", items: ["x"] }} />,
    );
    expect(html).toContain("status ok");
    expect(html).not.toContain("NOTE");
  });

  it("flags a result whose query differs from the input", () => {
    const html = renderToStaticMarkup(
      <Panel {...base} query="cat" shown={{ query: "ca", items: ["x"] }} />,
    );
    expect(html).toContain("status warn");
    expect(html).toContain("NOTE");
  });

  it("shows the empty state before any result", () => {
    const html = renderToStaticMarkup(<Panel {...base} query="" shown={null} />);
    expect(html).toContain("No results yet");
  });
});
