# Drift

Monorepo for [`@drift/after`](packages/after): validity over time for async work. Once a scope is
invalidated, the work started under it cannot commit stale results.

| Package                                      | Description                                                      |
| -------------------------------------------- | ---------------------------------------------------------------- |
| [`@drift/after`](packages/after)             | Framework-independent core. Zero runtime dependencies.           |
| [`@drift/after-react`](packages/after-react) | `useScope()` hook, disposed on unmount, StrictMode-safe.         |
| [`apps/demo`](apps/demo)                     | Side-by-side race: a naive search versus one guarded by `after`. |

## Development

Requires Node 22+ and pnpm 9.

```sh
pnpm install
pnpm check        # lint, typecheck, test and build everything (Turborepo caches results)
pnpm dev          # run the demo at http://localhost:5173
pnpm changeset    # record a change for the next release
```

## Releasing

Changesets handles versioning. Merge a PR with a changeset to `main`, then run
`pnpm version-packages` and `pnpm release`. The release workflow publishes with npm provenance.

## License

MIT
