import { type Run, type Scope, type ScopeOptions, scope } from "@drift/after";
import { useEffect, useState } from "react";

interface Holder {
  current: Scope;
  options: ScopeOptions | undefined;
}

/**
 * Returns a scope tied to the component's lifetime. The returned object keeps the same identity
 * across renders, and its underlying scope is disposed on unmount.
 *
 * Calls made after unmount (a late response, a stray timer) return already-invalid runs, so they
 * cannot update unmounted state.
 *
 * Safe under React StrictMode. Its dev-only mount, unmount, remount cycle disposes the first
 * underlying scope, and the effect then creates a fresh one. `options` is read on the first render;
 * changing it later has no effect, because a scope's configuration is fixed for its lifetime.
 */
export function useScope(options?: ScopeOptions): Scope {
  const [holder] = useState<Holder>(() => ({ current: scope(options), options }));
  const [handle] = useState<Scope>(() => createHandle(holder));

  useEffect(() => {
    if (holder.current.disposed) holder.current = scope(holder.options);
    return () => {
      holder.current.dispose();
    };
  }, [holder]);

  return handle;
}

function createHandle(holder: Holder): Scope {
  return {
    run: (): Run => holder.current.run(),
    invalidate: (reason?: unknown) => holder.current.invalidate(reason),
    dispose: () => holder.current.dispose(),
    get signal() {
      return holder.current.signal;
    },
    get disposed() {
      return holder.current.disposed;
    },
  };
}
