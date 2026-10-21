import type { SearchResult } from "./search.js";

interface PanelProps {
  title: string;
  tone: "bad" | "good";
  query: string;
  onQuery(q: string): void;
  shown: SearchResult | null;
  staleNote: string;
}

export function Panel({ title, tone, query, onQuery, shown, staleNote }: PanelProps) {
  const stale = shown !== null && shown.query !== query;
  return (
    <section className={`panel ${tone}`}>
      <h2>{title}</h2>
      <input
        aria-label={`${title} search`}
        value={query}
        placeholder="type ca, then cat"
        onChange={(e) => onQuery(e.target.value)}
      />
      <p className={stale ? "status warn" : "status ok"}>
        {shown === null
          ? "No results yet"
          : stale
            ? `Showing results for "${shown.query}", but the input says "${query}"`
            : `Showing results for "${shown.query}"`}
      </p>
      <ul>
        {shown?.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {stale ? <p className="note">{staleNote}</p> : null}
    </section>
  );
}
