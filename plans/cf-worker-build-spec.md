# Cloudflare Worker Build — Architecture Spec

This started as a forward-looking migration spec for the Cloudflare build path in One. As of 2026-04-21, the branch described here is green, so this file now serves as both the original reasoning record and the architecture note for what actually landed.

---

## Part 1 — The problem

### One user problem (3pc / klaviyo)

Users can't deploy apps to Cloudflare Workers if their api routes import common Node-first CJS packages. The class of affected packages: `klaviyo-api`, `stripe-node`, `axios`, `twilio`, `pg`, `form-data`, `node-fetch` — anything that does `require('node:http')` or similar at module load. These all run fine under Node (any Node-based deploy target), but fail at runtime in workerd even with `nodejs_compat` enabled.

The failure mode is one of:
- `TypeError: p2 is not a function` — minified identifier collision after rolldown's CJS→ESM wrapper bundles a Node-first package
- `createRequire(undefined)` → `The argument 'path' must be a file URL object, a file URL string, or an absolute path string. Received 'undefined'` — workerd evaluating `createRequire(import.meta.url)` in a bundled chunk where `import.meta.url` resolved to undefined
- `Cannot read properties of null (reading 'useContext')` — React dispatcher null during SSR render (appears under specific plugin configurations; see Part 4)

### Framework-level problem

The hand-rolled Cloudflare worker build in `packages/one/src/cli/build.ts` (the `case 'cloudflare':` branch, around lines 1299–1450) does its own vite invocation with `ssr.noExternal: true`, `ssr.target: 'node'`, workerd resolve conditions, and manual react-native-web aliases. It works for SSR/api/middleware/pages that don't touch the problematic CJS class — but has no unenv polyfills, no `esmExternalRequirePlugin` equivalent, no way to handle the CJS chunks that Cloudflare's own `@cloudflare/vite-plugin` solves.

The official `@cloudflare/vite-plugin` (`@cloudflare/vite-plugin@^1.33.1`) handles all of this via its internal `NodeJsCompat` class that pipes `@cloudflare/unenv-preset` into the build, and adds `esmExternalRequirePlugin` to the rolldown pipeline. Adopting it is the clean long-term answer. Getting there has been the work.

---

## Part 2 — Current state (as of 2026-04-21, after the fix)

### Branch state

The combined `unified-build-mode` work now includes:
- `build.server.unified: true`
- nested api middleware build + context-key fixes
- `@cloudflare/vite-plugin` based worker build
- updated Cloudflare output layout: `dist/worker/index.js` + `dist/worker/wrangler.json`
- un-skipped unified CJS regression tests for `date-fns + ms` and `axios`

### What shipped

The final implementation is a hybrid of the original Option X and Option Z ideas:
- SSR / page routes still lazy-load the pre-built `dist/server/*` output
- API routes lazy-load **source files**
- middleware routes keep their built lookup keys, but lazy-load **source files**
- the worker itself is bundled by `@cloudflare/vite-plugin` via `createBuilder(..., viteEnvironment: { name: 'worker' })`

That shape keeps the existing Node-targeted SSR/SSG flow intact while letting the Cloudflare plugin own the API and middleware dependency graphs from source, which is what fixed the CJS worker failures.

### Verified status

- `tests/test-cloudflare` = **27/27**
- `tests/test-build-unified` = **22/22**
- repo root `bun run test` = **26 successful, 26 total**

Key historical note: the originally-reported React dispatcher null error (`Cannot read properties of null (reading 'useContext')`) did **not** reproduce in the final rerun. The real regressions were the missing `ONE_CACHE_KEY` define and the `createRequire(undefined)` CJS chunk issue described below.

---

## Part 3 — How the build works today

Four sequential passes run on `one build --platform=web`:

### Pass 1 — client + server (via `vxrnBuild` in `packages/vxrn/src/exports/build.ts`)

One `viteBuild()` call runs both `client` and `ssr` environments in parallel via Vite 6 Environments.

- **Client env** — input `virtual:one-entry`, outputs `dist/client/**/*.js` + `dist/client/index.html` (for SSG HTML templates). Run in parallel with server env.
- **SSR env** — input `virtual:one-entry` (single entry), `ssr.noExternal: true` (unified mode: `['react', 'react-dom']` only), outputs `dist/server/_virtual_one-entry.js` + shared chunks under `dist/server/assets/`. Node-targeted by default.

Output:
- `dist/client/*` — static client assets served by CF's `assets` binding at deploy time
- `dist/server/*` — server entry + shared chunks, used for both build-time SSG and runtime SSR in the worker

### Pass 2 — api routes (via `buildCustomRoutes('api', ...)` in `packages/one/src/cli/build.ts`)

Separate `viteBuild()` call. Multi-input: one entry per api route file. Output: `dist/api/api/<route>.js`. Each file is a fully-bundled ES module with all deps inlined.

In the unified mode PR: derives config from `serverBuildConfig` (shares defines/plugins/externals with pass 1) instead of deriving from `webBuildConfig`. Drops blanket `ssr.noExternal: true`.

### Pass 3 — middlewares (via `buildCustomRoutes('middlewares', ...)`)

Identical to pass 2 except input is middleware files and output dir is `dist/middlewares/`. Runs in `Promise.all` with pass 2.

### Pass 4 — Cloudflare worker (case 'cloudflare' in build.ts, only on `deploy: 'cloudflare'`)

Generates `dist/_worker-src.js` on disk, a hand-written ES module that:
1. Imports `serve, setFetchStaticHtml` from `one/serve-worker` (internal framework helper)
2. Builds a `lazyRoutes` map: `{ serverEntry: () => import('./server/_virtual_one-entry.js'), pages: {...}, api: {...}, middlewares: {...} }` — every value is a dynamic import closure pointing at a pass 1/2/3 output file
3. Exports a default `{ fetch(request, env, ctx) { ... } }` that wires the lazy map into the runtime router and handles the CF `ASSETS` binding

Then runs a separate `viteBuild()` on `_worker-src.js` with:
- `ssr: { target: 'node', noExternal: true }`
- `resolve.conditions: ['workerd', 'worker', 'node', 'module', 'default']`
- react-native → react-native-web aliases
- hardcoded externals for RN devtools (`@react-native/dev-middleware`, `metro`, `.node` files)

Output: `dist/worker.js` (single file) + `dist/wrangler.jsonc` with `find_additional_modules: true` and ESModule glob rules pointing at `./server/**`, `./api/**`, `./middlewares/**`, so workerd discovers the lazy-imported chunks as separate ES modules at deploy time.

### Why pass 4 is the problem

- `ssr.noExternal: true` forces rolldown to bundle every npm dep into the worker output
- Node-first CJS packages (klaviyo, axios, stripe-node) use `require('node:http')` patterns that rolldown wraps with `createRequire(import.meta.url)` shims
- Those shims work in Node but fail in workerd under certain conditions (see Part 4's ONE_CACHE_KEY section for a related class of runtime-vs-buildtime discrepancy)
- The plugin solves this via unenv polyfills + `esmExternalRequirePlugin`; the hand-rolled path has no equivalent

---

## Part 4 — Specific bugs hit along the way

### Bug A: Nested api middleware never built (pre-existing, fixed in PR #698)

**Symptom**: middlewares under `app/api/<subdir>/_middleware.ts` never appeared in `dist/middlewares/`; runtime tried to load the source path and returned undefined.

**Root cause**: `packages/one/src/server/getServerManifest.ts` had a loop that `continue`d past the middleware-collection block for api routes, so middlewares that only applied to api routes never made it into `manifest.middlewareRoutes` → never built → never dispatched.

**Fix**: move the middleware-collection block BEFORE the `continue`. Shipped in PR #698.

**Companion fix**: in `packages/one/src/cli/build.ts` the `createBuildManifestRoute` function only rewrote middleware contextKeys for routes that went through `buildPage` (page routes only). API routes retained source paths as their contextKey. Added fallback to the `builtMiddlewares` map so both paths get rewritten.

### Bug B: `ONE_CACHE_KEY` not inlined in plugin's worker bundle (fixed in uncommitted work)

**Symptom**: After adopting `@cloudflare/vite-plugin`, client-side navigation to dynamic routes timed out. Playwright tests `should navigate from SSG to dynamic route` and `should navigate between dynamic routes` failed. Direct SSR worked.

**Root cause**: `packages/one/src/constants.ts` computes `CACHE_KEY`, `PRELOAD_JS_POSTFIX`, `CSS_PRELOAD_JS_POSTFIX` at module init from `process.env.ONE_CACHE_KEY`:

```ts
CACHE_KEY = `${process.env.ONE_CACHE_KEY ?? Math.round(Math.random() * 1e8)}`
PRELOAD_JS_POSTFIX = `_${CACHE_KEY}_preload.js`
CSS_PRELOAD_JS_POSTFIX = `_${CACHE_KEY}_preload_css.js`
```

The hand-rolled worker build inlined `process.env.ONE_CACHE_KEY` via vite's `define:` config. The plugin-driven build did not — it relied on the plugin's own defines, which didn't include `ONE_CACHE_KEY`. At runtime the worker picked a random key via `Math.round(Math.random() * 1e8)` on each worker start, so preload URL matching failed:

- HTML bakes `/assets/dynamic_123_81280208_preload.js` at build time
- Worker expects `/assets/dynamic_123_<random-per-startup>_preload.js`
- Fetch returns null → worker wrapper falls through to `env.ASSETS.fetch` → 404 → top-level fetch returns null → workerd throws `Incorrect type for Promise: the Promise did not resolve to 'Response'`

**Fix**: when calling `createBuilder(...)` for the plugin's worker env in `packages/one/src/cli/build.ts`, add:

```ts
define: {
  'process.env.NODE_ENV': JSON.stringify('production'),
  'process.env.VITE_ENVIRONMENT': JSON.stringify('ssr'),
  'process.env.ONE_CACHE_KEY': JSON.stringify(constants.CACHE_KEY),
},
```

After this, `tests/test-cloudflare` = 27/27 green with the plugin.

### Bug C: `createRequire(undefined)` in re-bundled CJS chunks (fixed)

**Original symptom**: In `tests/test-build-unified`, api routes that import `axios` or `date-fns+ms` returned HTTP 500 with:

```
TypeError: The argument 'path' must be a file URL object, a file URL string, or an absolute path string. Received 'undefined'
    at createRequire (node:module:34:15)
    at .../dist/worker/assets/ms-*.js
```

**Root cause**: Pass 2 / pass 3 emitted built route chunks for CJS deps like `ms` with a top-level pattern:

```js
import { createRequire } from "node:module";
var __require = /* @__PURE__ */ createRequire(import.meta.url);
```

This is rolldown's CJS interop wrapper. When the plugin's worker env re-bundled those pre-built chunks, the wrapper survived. At runtime in workerd, `import.meta.url` for dynamically-imported chunks could resolve to undefined, and `createRequire(undefined)` threw.

**What was tried and didn't work**:
- Re-introducing `ssr.target: 'webworker'` on the server build in `packages/vxrn/src/exports/build.ts` (vite's `isSsrTargetWebworkerEnvironment` code path pushes `esmExternalRequirePlugin` which should replace the `__require` calls) — chunk still contained `createRequire(undefined)`
- `inlineDynamicImports: true` on the plugin's worker output — single worker.js, single React instance, but the `createRequire` is at module init and still runs

**Final fix**: keep SSR/page routes importing `dist/server/*`, but make the worker import API and middleware routes from **source**. In `packages/one/src/cli/build.ts`:
- `lazyRoutes.api` now imports source files under the router root
- `lazyRoutes.middlewares` keeps the built lookup key, but imports middleware source files
- `@cloudflare/vite-plugin` therefore processes those graphs from source and applies its unenv/CJS transforms before rolldown bakes in the problematic wrapper

**Required companion fix**: the worker build also needed `build.rolldownOptions.shimMissingExports = true` so the source-imported worker graph would tolerate RN-to-RN-web aliasing for packages like `react-native-screens`.

**Verification**:
- `rg "createRequire\\(|import \\{ createRequire \\}|__require\\(" tests/test-build-unified/dist/worker -g '*.js'` returned no matches after the change
- `curl /api/date-fmt` returned `{"formatted":"2024-06-15","ms":3600000}`
- `curl /api/axios-import` returned `{"loaded":true,"hasGet":true,"hasPost":true}`
- `tests/test-build-unified` went to **22/22**

### Historical note: the React dispatcher bug

The original Option X investigation (before the ONE_CACHE_KEY fix was isolated) reported a React dispatcher null error:

```
TypeError: Cannot read properties of null (reading 'useContext')
[one] Error rendering SSR route ./dynamic/[id]+ssr.tsx
```

**This did not reproduce on the later rerun.** It was likely a transient artifact of the specific broken state (mixed defines, incomplete plugin config, stale cached dist from a prior build) rather than a fundamental plugin issue. The successful later run shows dynamic SSR rendering cleanly. Treat it as historical unless it is reproduced again in the actual plugin path.

---

## Part 5 — The three options

The goal: let the klaviyo/axios/stripe-node class of CJS packages work in One apps deployed to Cloudflare.

### Option X — plugin replaces pass 4, with source-imported api/middleware (landed)

**What it does**: Drop the hand-rolled worker build in pass 4. Replace it with `@cloudflare/vite-plugin` running as a worker Vite environment. Keep the existing Node-targeted SSR/SSG build, but let the worker import API and middleware routes from source so the plugin controls those dependency graphs.

**Mechanics**:
- Write `_worker-src.js` as the generated lazy-route dispatcher
- Write a temp wrangler config with `main` pointing at `_worker-src.js`, compat date, compat flags, merged user wrangler.jsonc
- Use `createBuilder` (not `build()`) so the plugin only builds the worker env (`build()` would try to build a client SPA env looking for `index.html` and fail since our client build is in pass 1 already)
- Pass `viteEnvironment: { name: 'worker' }` + `configPath`
- Supply `resolve.alias` for RN → react-native-web shims
- Supply `define` for `NODE_ENV`, `VITE_ENVIRONMENT`, `ONE_CACHE_KEY`
- Keep page / SSR lazy-routes pointed at `dist/server/*`
- Point API and middleware lazy-routes at source files under `app/`
- Set `rolldownOptions.shimMissingExports = true` on the worker build
- Plugin strips `find_additional_modules` from the input wrangler config and emits its own `wrangler.json` with `no_bundle: true` + `rules: [{type: 'ESModule', globs: ['**/*.js', '**/*.mjs']}]` — code-split chunks deploy as separate files automatically

**Current state**: Implemented and green. `tests/test-cloudflare` is 27/27. `tests/test-build-unified` is 22/22. Root `bun run test` is 26 successful, 26 total.

**Tradeoffs**:
- ✅ Smallest change that actually solved the CJS worker problem
- ✅ SSG-in-Node at build time works unchanged (pass 1 is still Node-targeted)
- ✅ `tests/test-cloudflare` passes fully
- ✅ `axios` / `date-fns + ms` class works in the unified Cloudflare fixture
- ❌ Dist layout change: `dist/worker.js` + `dist/wrangler.jsonc` → `dist/worker/index.js` + `dist/worker/assets/` + `dist/worker/wrangler.json`. Downstream users relying on the old paths (including test fixture setup files) need updates
- ❌ The worker graph is now intentionally mixed: pages/SSR come from `dist/server`, api/middleware come from source
- ❌ The plugin's input wrangler format (`compatibility_date`, `compatibility_flags`) + its stripping of `find_additional_modules` means the hand-written `createCloudflareWranglerConfig` helper has some now-dead logic

**Estimate**: Done.

**When to choose**: Chosen. This is the current branch architecture.

---

### Option Y — merge SSR and worker into one env via `viteEnvironment: { name: 'ssr' }`

**What it does**: One Vite environment does both SSR and the deployed worker. The plugin's build settings (workerd conditions, unenv polyfills, platform: 'neutral') apply to SSR too. SSG at build time runs that bundle under **workerd via miniflare**, not Node, using the plugin's experimental `prerenderWorker` feature.

**Mechanics**:
- Remove the current vxrn SSR build config entirely (or repurpose it heavily)
- Plugin's worker env becomes the single server build
- `_virtual_one-entry` is a worker entry that exports `{ fetch }`
- Build-time SSG: plugin spins up a miniflare instance, sends HTTP requests to the worker bundle for each SSG path, captures the response HTML, writes it to disk as static files
- Api/middleware: either build from source in the same env (multi-input) or stay as separate `buildCustomRoutes` passes

**Tradeoffs**:
- ✅ Single server build — no duplication between SSR and worker
- ✅ One runtime for SSG and deployment — whatever works at SSG build time works at deploy time, no Node/workerd drift
- ✅ Plugin's unenv polyfills apply uniformly; klaviyo/axios/stripe-node class fully solved
- ❌ SSG-at-build-time now requires miniflare running in-process — slower (miniflare has a nontrivial startup cost), and `prerenderWorker` is marked experimental in the plugin
- ❌ Large rearchitecture of `packages/one/src/cli/buildPage.ts` and related SSG code. Currently SSG imports server bundle output directly in Node and invokes loader/render functions; under miniflare it'd have to go through HTTP
- ❌ Dev server story: workerd-only means losing some Node-native introspection and the existing `one/serve` hono-based dev path probably needs a rethink
- ❌ Loses the ability for users to deploy the same server bundle to Node. Today `deploy: 'node'` works off pass 1's output. Under Option Y it'd need a separate build mode

**Estimate**: 2-3+ weeks for a working implementation. Many uncertainties around the prerenderWorker API maturity and the SSG pipeline rewrite.

**When to choose**: Not now. File under "consider for a future major version when the `prerenderWorker` API stabilizes and the Node deploy target is less important."

---

### Option Z — dedicated worker env alongside the existing SSR env, build server code twice

**What it does**: Keep pass 1's `ssr` env (Node-targeted, for SSG at build time). Add a new `worker` env registered by the plugin. The worker env builds **from source** — it imports `virtual:one-entry` (SSR render code), all api route source files, all middleware source files — and the plugin bundles them fresh with workerd conditions + unenv polyfills.

Pass 2 (api) and pass 3 (middleware) can be **dropped entirely** for CF deploys. The worker env builds them too.

**Mechanics**:
- `packages/vxrn/src/exports/build.ts` stays mostly unchanged for Node SSG build (pass 1)
- In `packages/one/src/cli/build.ts` `case 'cloudflare'`:
  - Skip `buildCustomRoutes('api', ...)` and `buildCustomRoutes('middlewares', ...)` when using Option Z
  - Generate `_worker-src.js` with imports against source paths instead of pre-built output paths:
    ```js
    import * as serverEntry from 'virtual:one-entry'
    import * as apiHello from '../app/api/hello+api.ts'
    import * as mwRoot from '../app/_middleware.ts'
    // ... etc
    const lazyRoutes = {
      serverEntry: () => Promise.resolve(serverEntry),
      api: { '/api/hello': () => Promise.resolve(apiHello) },
      middlewares: { 'root': () => Promise.resolve(mwRoot) },
    }
    ```
  - Or use dynamic imports (`() => import('../app/api/hello+api.ts')`) so rolldown code-splits naturally
  - Register the plugin's worker env with the generated `_worker-src.js` as input
  - Plugin builds everything from source in one pass with its full unenv pipeline
- SSG code path is unchanged — it still imports `dist/server/_virtual_one-entry.js` from pass 1's output

**Key insight (from this spec's Part 4)**: The SSR render code (`virtual:one-entry`) has to be in the worker env too, not just api/middleware. At request time in CF, the worker dispatches to the SSR renderer for `ssr` / `ssg`-mode routes. If the worker env only has api/middleware, SSR at request time has nowhere to go. So Z must include SSR render code, which means it gets built twice: once for Node (pass 1, for build-time SSG) and once for workerd (pass 4, for deployment).

**Tradeoffs**:
- ✅ No re-bundling of pre-built chunks — Bug C goes away because the plugin controls the entire graph from source
- ✅ klaviyo/axios/stripe-node class fully solved via unenv
- ✅ SSG-in-Node at build time unchanged
- ✅ Clean separation of concerns — each env has exactly one target runtime
- ❌ SSR render code (virtual:one-entry, react, tamagui, page components) is compiled twice per build — once Node-targeted, once workerd-targeted. Rolldown is fast (~1-2s per pass for a typical app) but it's real time in CI
- ❌ `buildPage.ts` imports pass 1's `serverJsPath` to run loaders/render for SSG. If pass 1 and pass 4 have different chunking (which they will, different conditions), the SSG path depends on pass 1 and the worker depends on pass 4 — two source-of-truths for the same code. Mostly fine because each has a well-defined purpose, but any drift between Node-bundled and workerd-bundled versions of the same component is a potential bug source
- ❌ The worker env needs the plugin's full resolve config (conditions, aliases, unenv) AND the RN → RN-web aliases we currently add. Duplicated config between pass 1 and pass 4 needs to be carefully factored

**Estimate**: 1 week for basic wiring, 1 additional week for validation (making sure the two builds produce behavior-equivalent code). Total 1.5–2 weeks.

**When to choose**: Only if the current hybrid path later proves insufficient and we want the worker to own the SSR/page graph from source too. It is no longer required to solve the CJS worker problem.

---

## Part 6 — Decision matrix

| Criterion | Landed hybrid X/Z | Option Y | Full Option Z |
|---|---|---|---|
| Fixes klaviyo/axios/stripe-node class | Yes | Full | Full |
| SSG-in-Node at build time works | Yes | No (miniflare) | Yes |
| Build time | Fastest | Slower (miniflare startup) | 1 extra rolldown pass |
| Architectural complexity delta | Minimal | Large | Medium |
| Risk | Low | High | Medium |
| Preserves Node deploy target | Yes | Needs rework | Yes |
| Estimated work remaining | Done | 2-3+ weeks | 1.5–2 weeks |

**Recommendation**: Merge the landed hybrid path. It solved the user problem without reworking SSG around a full source-first worker build. Keep full Option Z as a future simplification/fallback only if the worker later needs to own the page/SSR graph from source too.

---

## Part 7 — Follow-up work

Ordered from merge-critical to optional cleanup:

### 1. Merge with the current test baseline intact
- `tests/test-cloudflare` should remain **27/27**
- `tests/test-build-unified` should remain **22/22**
- repo root `bun run test` should remain **26 successful, 26 total**

### 2. Validate downstream apps with real CJS-heavy deps
- Release into `~/chat`, `~/takeout-free`, `~/takeout`, or the actual 3pc repro app via `bun release --into <path>`
- Verify builds and deploys still succeed with packages in the `axios` / `stripe-node` / `klaviyo-api` class
- Prefer direct endpoint checks over assuming the fixture coverage is enough

### 3. Clean up the build path if the new shape holds up
- Simplify `createCloudflareWranglerConfig` if the plugin output makes some generated fields permanently redundant
- Revisit whether `GENERATED_CLOUDFLARE_WRANGLER_RULES` still needs to exist in its current form
- Keep the deployment guide in `apps/onestack.dev/data/docs/guides-deployment.mdx` aligned with the `dist/worker/*` layout

### 4. Keep full Option Z in reserve, not on the critical path
- If page/SSR worker graphs later need the same source-first treatment as API and middleware, revisit full Option Z
- Until then, the landed hybrid shape is the lower-risk architecture because it leaves the Node-targeted SSG pipeline alone

---

## Part 8 — File and code references

### Where to make changes

- `packages/one/src/cli/build.ts` — the `case 'cloudflare':` branch (lines ~1299–1450 on main; rewritten in local working tree)
- `packages/one/src/server/workerHandler.ts` — runtime worker request handler; lazy-routes map consumer
- `packages/one/src/serve-worker.ts` — the `serve` function imported by `_worker-src.js`
- `packages/one/src/constants.ts` — where `ONE_CACHE_KEY` is read (critical for Bug B)
- `packages/vxrn/src/exports/build.ts` — pass 1 (client + SSR server); `serverBuildConfig` used as base for unified mode api builds
- `packages/one/src/cli/buildPage.ts` — SSG-at-build-time renderer, imports pass 1's server output and runs loader/render for each SSG path
- `packages/one/src/vite/types.ts` — `oneOptions.build.server` type, where `unified` lives
- `packages/one/src/server/getServerManifest.ts` — route manifest generator; where Bug A was fixed

### Test fixtures

- `tests/test-cloudflare/` — comprehensive CF deploy fixture, 27 tests (playwright + HTTP + wrangler config), existing
- `tests/test-build-unified/` — new fixture from PR #698, 22 tests, now fully green, exercises nested middlewares + dynamic api routes + tricky deps (`axios`, `date-fns`, `ms`, `zod`)

### External references

- `@cloudflare/vite-plugin` source: `https://github.com/cloudflare/workers-sdk/tree/main/packages/vite-plugin-cloudflare`
- Plugin docs: `https://developers.cloudflare.com/workers/vite-plugin/`
- Plugin NodeJsCompat source: `node_modules/@cloudflare/vite-plugin/dist/index.mjs` (search for `NodeJsCompat`, `nodeJsCompatPlugin`, `esmExternalRequirePlugin`)
- Vite Environment API: `https://vite.dev/guide/api-environment.html`
- unenv: `https://github.com/unjs/unenv`

### Related prior work

- PR #698 branch `unified-build-mode`: https://github.com/onejs/one/pull/698
- This spec: `/Users/n8/one/plans/cf-worker-build-spec.md`
- Earlier handoff (now partially outdated): `/Users/n8/one/plans/cf-vite-plugin-investigation.md`

---

## Part 9 — Operational constraints

From `~/.claude/CLAUDE.md`, things to be careful of:

- **Don't push to main.** Use a side branch and open a PR.
- **Don't run `gh run watch`.** It burns the 60/hr GitHub API rate limit in minutes. Trigger CI, share the Actions URL, move on.
- **Don't `npm publish`** without explicit user permission. One's packages publish via a controlled release flow.
- **`bun release --into <dir>`** packs workspace packages and extracts them into a target's node_modules. Use this to validate changes in `~/chat`, `~/takeout-free`, `~/takeout` downstream. Note: if the target project runs `bun install` after, it may overwrite your released version with the npm-registry version — you'd need to re-release, or manually copy any non-workspace deps (like `@cloudflare/vite-plugin` when adopting the plugin).
- **Don't introduce fallback code paths.** If a feature works, commit to it. If it doesn't, revert cleanly. Don't ship "try A, fall back to B" hybrids.
- **Sandbox caveats.** `ps` doesn't work (setuid stripped). Use `pgrep`, `lsof`. `kill-my-port <PORT>` is the convention.

### Historical reproduction workflow for full Option Z

```
cd ~/one
git checkout unified-build-mode  # or the commit after the hybrid plugin path lands
git checkout -b option-z-from-source

# Make changes to packages/one/src/cli/build.ts and friends
bun run build --filter=one --filter=vxrn --force

# Test the unified fixture
cd tests/test-build-unified
rm -rf dist
bun run build:web
bun run test

# Test the cloudflare fixture
cd ../test-cloudflare
rm -rf dist
bun run build:web
bun run test
```

### Success criteria

A clean Option Z implementation passes when:

1. `tests/test-cloudflare` = 27/27 green
2. `tests/test-build-unified` = 22/22 green (with axios and date-fns un-skipped)
3. A new fixture exercising `stripe`, `jsonwebtoken`, `form-data` builds and runs
4. `~/chat`'s prod e2e tests pass against a canary deploy
5. Build time for the CF deploy hasn't more than doubled (double-build is acceptable, 10× would be too much)
6. Dist layout is documented and consistent (`dist/worker/`, plugin-emitted `wrangler.json`)
7. No regression in `tests/test` (Node SSR), `tests/test-vercel` (Vercel deploy), or any other fixture that doesn't deploy to Cloudflare
