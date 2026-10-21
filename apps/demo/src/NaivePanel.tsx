import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { Panel } from "./Panel.js";
import { fakeSearch, type SearchResult } from "./search.js";

/** Plain `await` with no guard: whichever response arrives last wins. This is the bug. */
async function naiveSearch(q: string, setShown: Dispatch<SetStateAction<SearchResult | null>>) {
  const result = await fakeSearch(q);
  setShown(result);
}

export function NaivePanel({ race }: { race: number }) {
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState<SearchResult | null>(null);

  useEffect(() => {
    if (race === 0) return;
    void naiveSearch("ca", setShown);
    const timer = setTimeout(() => void naiveSearch("cat", setShown), 50);
    return () => clearTimeout(timer);
  }, [race]);

  return (
    <Panel
      title="Without after"
      tone="bad"
      query={query}
      onQuery={(q) => {
        setQuery(q);
        void naiveSearch(q, setShown);
      }}
      shown={shown}
      staleNote="The UI shows results for an old query. Nothing crashed, and the code looks correct."
    />
  );
}
