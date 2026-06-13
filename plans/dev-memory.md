# Dev server memory: the per-request SSR re-eval leak (and the floor)

## Symptom
`one dev` grows to 5–8GB RSS over a long session and eventually OOM-crashes.
Reported on `~/soot` and `~/3pc`; both run `one dev`. Soot worked around it with
`NODE_OPTIONS=--max-old-space-size=16384`.

## Root cause (fixed)
`packages/one/src/vite/plugins/fileSystemRouterPlugin.tsx` called
`runner.clearCache()` on **every** page render. Clearing the SSR module runner
cache forces the next render to re-`import` the entire server module tree, and
each module is recompiled via `new AsyncFunction(code)`. Under sustained
navigation this:
- grows the V8 heap unboundedly (~1.5MB/request on a tiny app) — V8 never returns
  freed pages, so RSS ratchets to the high-water mark and stays there → OOM.
- re-transforms every module each request (native bundler churn), inflating the
  non-heap RSS floor as well.

Production (`oneServe.ts`, `workerHandler.ts`) never clears — it reuses modules
across requests and only resets per-request state via `__vxrnresetState()`. So
the cache clear was never needed for correctness; it was a dev-only crutch for
picking up file edits.

## Fix
Gate the clear behind a dirty flag set by the file watcher (`needsCacheClear`):
clear once after an actual change, reuse modules between changes. Edits are still
picked up (watcher → flag → one re-eval), HMR correctness preserved, leak gone.
Also removed `LoaderDataCache` (write-only dead state pinning loader payloads).

Commits on branch `fix/dev-ssr-memory-leak`.

## Validation (runtime, instrumented with process.memoryUsage every 2s)
| app | before (per-request clearCache) | after (dirty flag) |
|---|---|---|
| examples/one-basic | 3.1GB idle → 6.6GB heap-climbing → **OOM crash** @2500 req | ~1.0–1.2GB **flat** @8500 req |
| apps/onestack.dev | 0.7GB → ratchets to ~5GB → **OOM crash** @350 req | warms to ~2.4GB then **flat** @5000 req, no crash |

`one` test suite: 523 pass / 0 fail. HMR verified (edit a route → SSR reflects it;
revert → reverts).

## Deploying to soot / 3pc
Both ship byte-identical leaky code (soot one@1.17.11, 3pc one@1.17.10, same
`runner.clearCache()` at line 114). Their installed dists were hot-patched
(`/tmp/patch-installed-one.cjs` — idempotent, esm+cjs) for immediate relief on
**dev-server restart**. That patch is lost on `bun install`; the durable path is
shipping this `one` build into them (`bun release --into ~/soot` / `~/3pc`) or a
version bump once `one` is released.

## Remaining opportunity: the native RSS floor (NOT yet done)
After the fix, RSS plateaus flat but at a high floor (~2.4GB onestack; likely
3GB+ for soot/3pc). heapUsed collapses to ~7MB between GCs, so the floor is
almost entirely **native** memory (rolldown/oxc/esbuild dep-optimizer +
transforms), multiplied across Vite environments (client, ssr, and for native
apps ios+android). Candidates, by impact (from RCA, need native-build validation):
1. Dispose the rolldown native dev engine when `connectedNativeClients` hits 0
   (`vxrn/src/plugins/reactNativeDevServer.ts` / `utils/createNativeDevEngine.ts`).
   Reclaims a persistent per-platform chunk during web-focused work.
2. Don't run `optimizeDeps` for the `ios`/`android` Vite environments — native
   bundling goes through the rolldown engine, not these graphs
   (`vxrn/src/plugins/reactNativeCommonJsPlugin.ts:222`, `one/src/vite/one.ts`).
3. Drop/shrink dev sourcemaps for `node_modules` transforms across environments.

These touch the native pipeline — validate iOS/Android dev builds before shipping.
