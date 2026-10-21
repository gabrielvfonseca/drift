export interface SearchResult {
  query: string;
  items: string[];
}

/**
 * Simulates a search API where short queries are slow. "ca" takes 900 ms and "cat" takes
 * 200 ms, so the older request reliably finishes last. Rejects with AbortError if the signal fires.
 */
export function fakeSearch(query: string, signal?: AbortSignal): Promise<SearchResult> {
  const latency = query.length <= 2 ? 900 : 200;

  return new Promise<SearchResult>((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve({
        query,
        items: ["cathedral", "catalog", "cathode", "catnip"].map((w) => `${w} (for "${query}")`),
      });
    }, latency);

    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}
