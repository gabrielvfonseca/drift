# Demo: stale async responses

A small Vite + React app that shows the bug from the `@drift/after` README, side by side.
- **Without after:** a plain `await` with no guard. Type `ca` then `cat` within a second: the slow `ca` response
  arrives last and overwrites the results for `cat`.
- **With after:** each search starts a run. The older run is superseded, and `guard` plus `commit` keep its
  result out of the UI.

## Run it

From the repo root:

```sh
pnpm install
pnpm --filter demo dev      # http://localhost:5173
pnpm --filter demo test     # regression tests for the stale-query display
```

The latencies are simulated in `src/search.ts`: queries of two characters or fewer take 900 ms, and the rest take 200 ms.
