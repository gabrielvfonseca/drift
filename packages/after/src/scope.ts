import { link } from "./link.js";
import { type Run, RunImpl } from "./run.js";

/**
 * - `"latest"` (default): starting a run supersedes the previous run. Use it for "only the
 *   newest request may update the UI" (search, autocomplete, profile navigation).
 * - `"concurrent"`: runs coexist and stay valid until `invalidate()` or `dispose()`.
 */
export type ScopeMode = "latest" | "concurrent";

export interface ScopeOptions {
  /**
   * Parent scope. The child is invalidated when the parent is invalidated or disposed.
   * Superseding a run in the parent does not affect the child.
   */
  parent?: Scope;
  /** Defaults to `"latest"`. */
  mode?: ScopeMode;
}

export interface Scope {
  /** Starts a new run. In `"latest"` mode this supersedes the previous run. */
  run(): Run;

  /**
   * Makes every current run invalid. The scope stays usable, so later `run()` calls work.
   * No-op after `dispose()`.
   */
  invalidate(reason?: unknown): void;

  /**
   * Permanently closes the scope and all of its child scopes. Later `run()` calls return
   * already-invalid runs. Idempotent.
   */
  dispose(): void;

  /**
   * Signal of the current validity period. It aborts on `invalidate()` or `dispose()`,
   * not when a `"latest"` run is superseded. After `invalidate()`, reading `signal`
   * returns the next period's signal, so capture it before invalidating if you need it.
   */
  readonly signal: AbortSignal;

  /** `true` after `dispose()` has been called on this scope. */
  readonly disposed: boolean;
}

const SUPERSEDED = "superseded";

class ScopeImpl implements Scope {
  readonly #parent: ScopeImpl | undefined;
  readonly #mode: ScopeMode;
  #disposed = false;
  /** Aborted by invalidate()/dispose(). Renewed lazily on the next use. */
  #lifetime: AbortController | undefined;
  /** The newest run's controller, used only in "latest" mode. */
  #latest: AbortController | undefined;

  constructor(options: ScopeOptions) {
    if (options.parent !== undefined && !(options.parent instanceof ScopeImpl)) {
      throw new TypeError("`parent` must be a scope created by `scope()`.");
    }
    this.#parent = options.parent;
    this.#mode = options.mode ?? "latest";
  }

  get disposed(): boolean {
    return this.#disposed;
  }

  get signal(): AbortSignal {
    return this.#currentLifetime().signal;
  }

  run(): Run {
    const lifetime = this.#currentLifetime();

    if (this.#mode === "concurrent") {
      return new RunImpl(lifetime);
    }

    this.#latest?.abort(SUPERSEDED);
    const controller = new AbortController();
    this.#latest = controller;
    link(lifetime.signal, controller);
    return new RunImpl(controller);
  }

  invalidate(reason?: unknown): void {
    if (this.#disposed) return;
    this.#endLifetime(reason);
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#endLifetime("disposed");
  }

  #endLifetime(reason: unknown): void {
    this.#lifetime?.abort(reason);
    this.#lifetime = undefined;
    this.#latest = undefined;
  }

  /**
   * Returns the controller that backs new runs. After invalidate() a fresh one is created on
   * demand, linked to the parent's current lifetime. A disposed scope always returns an
   * already-aborted controller.
   */
  #currentLifetime(): AbortController {
    if (this.#disposed) {
      const controller = new AbortController();
      controller.abort("disposed");
      return controller;
    }

    if (!this.#lifetime || this.#lifetime.signal.aborted) {
      const controller = new AbortController();
      if (this.#parent) link(this.#parent.#currentLifetime().signal, controller);
      this.#lifetime = controller;
    }
    return this.#lifetime;
  }
}

/** Creates a scope. Start work with `scope.run()` and commit results through the run. */
export function scope(options: ScopeOptions = {}): Scope {
  return new ScopeImpl(options);
}
