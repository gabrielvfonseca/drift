import { act, createElement, StrictMode } from "react";
import { createRoot } from "react-dom/client";

interface Rendered<T> {
  result: { current: T };
  rerender(): void;
  unmount(): void;
}

interface ProbeProps<T> {
  hook: () => T;
  result: { current: T };
}

function Probe<T>({ hook, result }: ProbeProps<T>): null {
  result.current = hook();
  return null;
}

// React only double-invokes effects (the StrictMode remount) when the tree is rendered with
// createRoot inside StrictMode, so this helper does that directly instead of relying on
// renderHook's wrapper.
export function renderHookWith<T>(hook: () => T, options: { strict?: boolean } = {}): Rendered<T> {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  const result: { current: T } = { current: undefined as T };
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  const tree = () => {
    const probe = createElement(Probe<T>, { hook, result });
    return options.strict ? createElement(StrictMode, null, probe) : probe;
  };

  act(() => {
    root.render(tree());
  });

  return {
    result,
    rerender: () => {
      act(() => {
        root.render(tree());
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
}
