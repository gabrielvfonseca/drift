/**
 * Registered with `Symbol.for`, so errors from another copy of this package (a duplicate in the
 * bundle, or a different major version) are still recognized by `isStale`.
 */
const STALE_BRAND: unique symbol = Symbol.for("@drift/after/StaleError");

/**
 * Thrown when work is attempted, or resolves, after its run stopped being valid.
 *
 * `reason` is the value passed to `invalidate(reason)`, or the scope's default abort reason.
 */
export class StaleError extends Error {
  override readonly name = "StaleError";
  readonly reason: unknown;
  readonly [STALE_BRAND] = true;

  constructor(reason: unknown, options?: { cause?: unknown }) {
    super(
      "The run is no longer valid: its scope was invalidated, superseded or disposed.",
      options,
    );
    this.reason = reason;
  }
}

/** Type guard for `StaleError`, so callers can ignore expected cancellations in `catch`. */
export function isStale(error: unknown): error is StaleError {
  return (
    error instanceof StaleError ||
    (typeof error === "object" && error !== null && STALE_BRAND in error)
  );
}
