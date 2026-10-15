# Review: One SSR Context Reader Bridge (`da7865e5f`)

## Verdict: APPROVE

Approve commit `da7865e5f1e5a38b122230986b215efcc3dd9265` on branch `tm/one-render-context-bridge` (based on `origin/main` `765bc0073e32b9b37546db7d07af314946fa3ac8`) for PR merge as a standalone correctness fix.

## Premise and Cause

- **INFERRED** (from `packages/one/src/Root.tsx`, `packages/one/src/vite/one-server-only.tsx`, and `.build/website-round2/evidence/context-bridge/runtime/2-control/one-server.log`): When multiple Vite environments (such as `ssr` and `tamagui`) evaluate `one` with separate React module instances in the same process, top-level assignment of `globalThis['__vxrnGetContextFromReactContext']` in `Root.tsx` binds `useContext(ServerAsyncLocalIDContext)` to whichever environment evaluated `Root.tsx` last. During SSR rendering, `useServerContext()` in `one-server-only.tsx` invokes that foreign reader closure against a React instance with no active dispatcher, failing to read the rendering root's `ServerAsyncLocalIDContext` and triggering an invalid hook call warning. Moving the `globalThis['__vxrnGetContextFromReactContext']` assignment into `Root(props: RootProps)` installs the reader bound to the React instance and `ServerAsyncLocalIDContext` of the `Root` component that is actively rendering. Were this wrong, rendering `<Root />` after overwriting `globalThis['__vxrnGetContextFromReactContext']` with a foreign reader would still invoke the foreign reader and throw inside `Page`, or `2-control/one-server.log` would still emit React invalid-hook warnings during SSR route renders.

## Evidence

- **RAN**: Inspected commit `git show da7865e5f` in `/Volumes/Studio-Ext/worktrees/one-start-round2-studio`. Only `packages/one/src/Root.tsx` (+5/-3) and `packages/one/src/Root.serverContext.test.tsx` (+52) are modified.
- **RAN**: Read author baseline failure log `.build/website-round2/evidence/context-bridge/red/test.log`, which shows `src/Root.serverContext.test.tsx` failing on pre-fix source with `Error: context reader from another React runtime` and `AssertionError: expected 0 to be greater than 0`.
- **RAN**: Read `.build/website-round2/evidence/context-bridge/runtime/2-control/one-server.log`, `warning-origin.log`, and `memory.json`. All six SSR routes (`/`, `/docs/introduction`, `/docs/routing`, `/docs/configuration`, `/native`, `/blog/version-two`) render without React invalid-hook warnings; the remaining console warning in `warning-origin.log` is `Tamagui: Using global config fallback` from `@tamagui/web/dist/esm/config.mjs:21:14`.
- **RAN**: Executed the focused regression suite under `tm window run heavy --local --narrow -- bun run vitest --run src/Root.serverContext.test.tsx src/router/` in `/Volumes/Studio-Ext/worktrees/one-start-round2-studio/packages/one`:
  `Test Files  23 passed (23)`
  `Tests  109 passed | 2 skipped (111)`
  `✓ |one| src/Root.serverContext.test.tsx (1 test) 26ms`

## Defects, Simplifications, and DRY Merges

- **Defects**: None found in `packages/one/src/Root.tsx` or `packages/one/src/Root.serverContext.test.tsx`. The test properly isolates and restores `globalThis['__vxrnGetContextFromReactContext']`, `globalThis['__vxrnrequestAsyncLocalStore']`, and `globalThis['__vxrnVersion']` in a `finally` block and unmounts the test renderer inside `act`.
- **Simplifications / DRY merges**: None required. The reader arrow `() => useContext(ServerAsyncLocalIDContext)` could optionally be hoisted to a module-scoped constant alongside `ServerAsyncLocalIDContext` and assigned in `Root` to avoid allocating a closure per `Root` render, though `Root` renders once per request/mount so inline assignment is negligible and non-blocking.

## Limits

- Scope is strictly limited to the SSR React context bridge correctness fix in `da7865e5f`.
- Does not evaluate or accept any SSR memory candidate (`8c27d9ac8`) or performance claim.
- Does not address the separate Tamagui `Using global config fallback` warning tracked in `warning-origin.log`.
