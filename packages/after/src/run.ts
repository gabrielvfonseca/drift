import { StaleError } from "./errors.js";

/**
 * One unit of async work started under a scope. Runs are created by `scope.run()`
 * and become invalid when their scope is invalidated, superseded or disposed.
 */
export interface Run {
  /** `true` until the run's scope invalidates it. Stays `true` for the run's whole life otherwise. */
  readonly valid: boolean;

  /** Aborts when the run becomes invalid. Pass it to `fetch` and other abortable APIs. */
  readonly signal: AbortSignal;

  /**
   * Runs `fn` synchronously only if the run is still valid.
   * Returns `true` if `fn` ran, `false` if the run was already invalid.
   * Errors thrown by `fn` propagate to the caller.
   */
  commit(fn: () => void): boolean;

  /**
   * Awaits `value` and returns its result if the run is still valid when it settles.
   * Otherwise rejects with `StaleError`. A rejection that happens after the run went
   * stale is reported as `StaleError` too, with the original error as `cause`.
   */
  guard<T>(value: T | PromiseLike<T>): Promise<Awaited<T>>;

  /** Throws `StaleError` if the run is no longer valid. Useful between steps of sync code. */
  assertValid(): void;
}

export class RunImpl implements Run {
  readonly #controller: AbortController;

  constructor(controller: AbortController) {
    this.#controller = controller;
  }

  get valid(): boolean {
    return !this.#controller.signal.aborted;
  }

  get signal(): AbortSignal {
    return this.#controller.signal;
  }

  commit(fn: () => void): boolean {
    if (!this.valid) return false;
    fn();
    return true;
  }

  assertValid(): void {
    if (!this.valid) throw new StaleError(this.#controller.signal.reason);
  }

  async guard<T>(value: T | PromiseLike<T>): Promise<Awaited<T>> {
    let result: Awaited<T>;
    try {
      result = await value;
    } catch (error) {
      if (!this.valid) throw new StaleError(this.#controller.signal.reason, { cause: error });
      throw error;
    }
    this.assertValid();
    return result;
  }
}
