/**
 * Aborts `target` whenever `source` aborts, and detaches the listener once `target` aborts
 * for any reason. This keeps long-lived scopes from accumulating listeners.
 */
export function link(source: AbortSignal, target: AbortController): void {
  if (source.aborted) {
    target.abort(source.reason);
    return;
  }

  const onAbort = (): void => {
    target.abort(source.reason);
  };

  source.addEventListener("abort", onAbort, { once: true });
  target.signal.addEventListener(
    "abort",
    () => {
      source.removeEventListener("abort", onAbort);
    },
    { once: true },
  );
}
