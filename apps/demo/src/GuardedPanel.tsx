import { isStale, type Scope } from "@drift/after";
import { useScope } from "@drift/after-react";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { Panel } from "./Panel.js";
import { fakeSearch, type SearchResult } from "./search.js";

/**
 * Each search starts a run. A newer run supersedes the older one, `guard` stops the old one
 * after its await, and `commit` is the only place state changes.
 */
async function guardedSearch(
  scope: Scope,
  q: string,
  setShown: Dispatch<SetStateAction<SearchResult | null>>,
) {
  const run = scope.run();
  try {
    const result = await run.guard(fakeSearch(q, run.signal));
    run.commit(() => setShown(result));
  } catch (error) {
    if (!isStale(error)) throw error;
  }
}

export function GuardedPanel({ race }: { race: number }) {
  const scope = useScope();
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState<SearchResult | null>(null);

  useEffect(() => {
    if (race === 0) return;
    void guardedSearch(scope, "ca", setShown);
    const timer = setTimeout(() => void guardedSearch(scope, "cat", setShown), 50);
    return () => clearTimeout(timer);
  }, [race, scope]);

  return (
    <Panel
      title="With after"
      tone="good"
      query={query}
      onQuery={(q) => {
        setQuery(q);
        void guardedSearch(scope, q, setShown);
      }}
      shown={shown}
      staleNote="Unreachable: the guard drops stale responses, so the displayed query always matches the input."
    />
  );
}
