# @drift/after

Once a scope is invalidated, async work started under it cannot commit state.

```ts
import { scope } from "@drift/after";

const page = scope();

async function loadProfile(id: string) {
  const run = page.run(); // a newer run supersedes this one
  const profile = await run.guard(fetchProfile(id, { signal: run.signal }));
  run.commit(() => renderProfile(profile)); // runs only if still valid
}

page.invalidate(); // on navigation: every pending run is now invalid
```

If the first request finishes last, its `guard` rejects with `StaleError` and its `commit` never runs.
The old response can't overwrite the new profile.

## Why not just a counter or `AbortController`?

| Approach          | Stops the network request   | Stops code after `await` | Stops the state write | Covers multiple steps |
| ----------------- | --------------------------- | ------------------------ | --------------------- | --------------------- |
| Request counter   | no                          | you add a check          | you add a check       | you repeat it         |
| `AbortController` | yes, if the API supports it | no                       | no                    | no                    |
| `@drift/after`    | via `run.signal`            | yes (`guard`)            | yes (`commit`)        | yes, one scope        |

Use `AbortController` when you only need to cancel a request. Use `@drift/after` when several awaits or
side effects must agree about whether the result is still wanted.

## API

### `scope(options?)`

- `options.mode`: `"latest"` (default) or `"concurrent"`.
  - `latest`: `run()` supersedes the previous run. Good for search, autocomplete and navigation.
  - `concurrent`: runs stay valid until `invalidate()` or `dispose()`. Good for a set of parallel loads.
- `options.parent`: a child scope is invalidated when its parent is invalidated or disposed.
  Superseding a run in the parent does not affect the child.

Returns a `Scope`:
- `run(): Run`: starts work. Calls after `dispose()` return an already-invalid run.
- `invalidate(reason?)`: invalidates all current runs. The scope stays usable.
- `dispose()`: permanently closes the scope and its children. Idempotent.
- `signal`: aborts on `invalidate()` or `dispose()`. Reading it after `invalidate()` returns the next period's signal.
- `disposed`: `true` after `dispose()`.

### `Run`

- `valid`: `true` until the run becomes invalid.
- `signal`: aborts when the run becomes invalid. Pass it to `fetch` and other abortable APIs.
- `commit(fn): boolean`: calls `fn` only while valid. Returns whether it ran. Errors thrown by `fn` propagate.
- `guard(valueOrPromise)`: returns the resolved value if the run is still valid, otherwise rejects with `StaleError`.
  A rejection after the run went stale is also reported as `StaleError`, with the original error as `cause`.
- `assertValid()`: throws `StaleError` if the run is no longer valid.

### `StaleError` and `isStale(error)`

`StaleError` marks an expected cancellation. Check `isStale(error)` in `catch` blocks to ignore it.

## Limitations

- The library can't undo side effects. Anything performed before a `commit` (a mutation of global state, a
  sent analytics event) happens regardless. Route state changes through `commit`.
- `guard` only protects code that goes through it. A bare `await` is not checked.
- `isStale` uses `instanceof`, so two copies of the package in one bundle produce two `StaleError` classes.

## Framework bindings

- React: [`@drift/after-react`](../after-react) provides `useScope()`, which disposes on unmount and is StrictMode-safe.
- Other frameworks: create a scope where the component or page starts, and call `dispose()` where it ends.

## License

MIT
