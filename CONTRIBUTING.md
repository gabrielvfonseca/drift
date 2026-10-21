# Contributing

## Setup

Requires Node 22+ and pnpm 9 (`corepack enable` picks up the pinned version).

```sh
pnpm install
pnpm check
```

`pnpm check` runs lint, typecheck, tests and builds through Turborepo. Use `pnpm dev` to run the demo.

## Making a change

1. Add or update tests. Core changes need coverage for every branch; the thresholds in
   `packages/*/vitest.config.ts` are enforced.
2. Run `pnpm check`, and `pnpm --filter @drift/after check:package` if you touched the public surface.
3. Add a changeset with `pnpm changeset` describing the user-visible change.

## Design rules

- The core stays framework-independent and has zero runtime dependencies.
- Keep the public API small. New exports need a use case that the existing primitives cannot express.
- Behaviour changes to `commit`, `guard`, or invalidation semantics need a test in the differential suite.
