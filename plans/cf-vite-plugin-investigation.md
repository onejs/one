# Handoff: @cloudflare/vite-plugin Adoption for One Framework

This handoff is now mostly historical. The combined `unified-build-mode` work does adopt `@cloudflare/vite-plugin`, and the plugin path is green including the CJS cases that originally blocked it.

The important takeaway is that there were two distinct issues:

1. `tests/test-cloudflare` was failing because the plugin worker build was not inlining `process.env.ONE_CACHE_KEY`, so dynamic-route preload URLs stopped matching at runtime.
2. `tests/test-build-unified` was failing because the plugin worker was re-bundling pre-built `dist/api` / `dist/middlewares` chunks that already contained rolldown `createRequire(import.meta.url)` wrappers.

Both are now resolved in the combined branch.

## Final state (2026-04-21)

Landed together in this branch:
- `build.server.unified: true`
- nested `app/api/**/_middleware.ts` build + context-key fixes
- `@cloudflare/vite-plugin` based worker build in `packages/one/src/cli/build.ts`
- Cloudflare dist layout update to `dist/worker/index.js` + `dist/worker/wrangler.json`
- test fixture updates for both Cloudflare suites

Verified locally:
- `tests/test-cloudflare` -> **27/27**
- `tests/test-build-unified` -> **22/22**
- repo root `bun run test` -> **26 successful, 26 total**

## What actually fixed the plugin path

### Bug 1: missing `ONE_CACHE_KEY` define

The plugin worker bundle originally computed `CACHE_KEY` from the runtime fallback:

```ts
CACHE_KEY = `${process.env.ONE_CACHE_KEY ?? Math.round(Math.random() * 1e8)}`
```

That broke dynamic-route preload matching and caused the `Promise did not resolve to 'Response'` failures in `tests/test-cloudflare`.

The fix is real and still required:

```ts
define: {
  'process.env.NODE_ENV': JSON.stringify('production'),
  'process.env.VITE_ENVIRONMENT': JSON.stringify('ssr'),
  'process.env.ONE_CACHE_KEY': JSON.stringify(constants.CACHE_KEY),
},
```

### Bug 2: `createRequire(undefined)` from re-bundled CJS chunks

The original failing shape was: pass 2 / pass 3 emitted built route chunks that already contained rolldown CJS wrappers like:

```js
import { createRequire } from 'node:module'
var __require = /* @__PURE__ */ createRequire(import.meta.url)
```

When the plugin worker re-bundled those pre-built chunks, workerd later hit `createRequire(undefined)` at runtime.

The final fix was a hybrid of the old Option X and Option Z directions:
- Keep SSR / page routes importing the pre-built `dist/server/*` outputs
- Change worker `lazyRoutes.api` to import API route **source files**
- Change worker `lazyRoutes.middlewares` to keep the built lookup key, but import middleware **source files**

That lets the Cloudflare plugin own the API and middleware dependency graphs from source, so its unenv/CJS transforms run before any `createRequire(import.meta.url)` wrappers get baked in.

### Required companion fix

The worker build also needed:

```ts
build: {
  rolldownOptions: {
    shimMissingExports: true,
  },
}
```

Without that, the source-imported worker graph failed on `react-native-web` aliased packages such as `react-native-screens` that reference native-only exports.

## Current architecture

In `packages/one/src/cli/build.ts` `case 'cloudflare':`
- pages / SSR lazy-load from `dist/server`
- API lazy-routes import source files under the router root
- middleware lazy-routes keep the built manifest key but import source files
- the worker itself is bundled by `@cloudflare/vite-plugin` via `createBuilder(..., viteEnvironment: { name: 'worker' })`

This is the smallest shape that solved the user problem without rewriting SSG around a full source-first worker build.

## Historical note

The old React null-dispatcher / `useContext` theory should be treated as non-authoritative historical context. It did not reproduce in the final successful rerun and should not be used as the explanation for the Cloudflare regression unless someone reproduces it again in the actual plugin-enabled path.

## Historical note: original dispatcher theory

The section below is preserved as historical context only. Do **not** treat it as the current blocker unless you can reproduce it again in the actual plugin-enabled failing suites. The current confirmed blockers are already resolved:

1. fixed: `ONE_CACHE_KEY` preload mismatch in `tests/test-cloudflare`
2. fixed: `createRequire(undefined)` from unified CJS/api chunks in `tests/test-build-unified`

What follows is the earlier dispatcher-focused investigation that originally justified reverting Option X.

## The original dispatcher theory, in detail

When `@cloudflare/vite-plugin` re-bundles One's pre-built server chunks — chunks like `dist/server/assets/_id__ssr-BKoCpSs-.js` for dynamic routes, which the worker entry (`_worker-src.js`) references via `() => import('./server/assets/_id__ssr-BKoCpSs-.js')` — dynamic SSR routes fail at runtime with:

```
TypeError: Cannot read properties of null (reading 'useContext')
[one] Error rendering SSR route ./dynamic/[id]+ssr.tsx
```

The failure is in the React runtime's internal dispatcher: `ReactSharedInternals.H` is null when the page's component calls a hook. `react-dom/server.renderToString` is supposed to set this dispatcher before rendering; something in the plugin's bundling path breaks that flow.

**What we verified:**
1. **Static SSR routes work, only dynamic routes fail.** `/ssr-page` renders correctly server-side. `/dynamic/456` returns HTTP 200 with an empty body and logs the useContext error. Both use `useLoader`, both use `Link`, both use the same `useContext` under the hood.
2. **The loader endpoint itself works** — `curl http://localhost:3457/dynamic/456_<cacheKey>_vxrn_loader.js` returns `export function loader() { return {"id":"456",...} }`. So the server-side loader execution path is fine; it's the page *render* that breaks.
3. **React is deduped** after `inlineDynamicImports: true` was added to the plugin's output config. Verified by `grep -c "require_react\s*=" dist/worker/index.js` → 1. The bug persists even with a single React instance, so it isn't simple duplicate-module state.
4. **Both legacy and unified modes hit the bug** when running behind the plugin. We added a dynamic SSR page to `tests/test-build-unified/` as a sanity check — it also failed. So the bug is not mode-specific; it's purely a plugin + dynamic-route interaction.
5. **On main (without the plugin), all tests pass.** `tests/test-cloudflare` = 27/27 on main. The hand-rolled worker doesn't have this issue. So the plugin is the necessary condition for the bug.

**Relevant file paths in the broken state:**
- `/Users/n8/one/packages/one/src/cli/build.ts` — switch the `case 'cloudflare'` block to call the plugin via `createBuilder` (not `build()`, which tries to build a client SPA env looking for `index.html`). Use `viteEnvironment: { name: 'worker' }`.
- `/Users/n8/one/node_modules/@cloudflare/vite-plugin/` — plugin source. Key modules:
  - `src/cloudflare-environment.ts` — registers the worker environment, applies unenv, sets `platform: 'neutral'`, conditions `['workerd', 'worker', 'module', 'browser']`, `ssr: true`, `noExternal: true`.
  - `src/plugins/nodejs-compat.ts` — the `resolveId` hook that aliases `node:http` etc. to unenv polyfills. Lines 50-58 add `esmExternalRequirePlugin` for rolldown builds.
  - `src/workers-configs.ts` lines 141-152 — strips `find_additional_modules` from the user-supplied wrangler config.

## Historical reproduction flow for the dispatcher theory

Again: use this only if you are explicitly trying to see whether the old dispatcher symptom can still be reproduced. It is not the shortest path to the current merge blocker.

1. Check out the branch (create one for this investigation, don't commit to main):
   ```
   cd ~/one && git checkout main && git pull
   git checkout -b cf-plugin-investigate
   ```

2. Install the plugin as a dep of `packages/one`:
   ```
   # edit packages/one/package.json, add to dependencies:
   "@cloudflare/vite-plugin": "^1.33.1",
   bun install
   ```

3. In `packages/one/src/cli/build.ts`, around line 1299 (the `case 'cloudflare'` block), replace the `await viteBuild({...})` call that runs on the generated `_worker-src.js` with a `createBuilder` call. The pattern is:

   ```ts
   import { createBuilder } from 'vite'

   // write the worker source and input wrangler config to disk first
   const wranglerInputConfig = createCloudflareWranglerConfig(
     projectName,
     userWranglerConfig?.config
   )
   wranglerInputConfig.main = relative(join(options.root, outDir), workerSrcPath)
   const wranglerInputPath = join(options.root, outDir, '_wrangler.input.jsonc')
   await FSExtra.writeFile(wranglerInputPath, JSON.stringify(wranglerInputConfig, null, 2))

   const { cloudflare } = await import('@cloudflare/vite-plugin')
   const builder = await createBuilder({
     root: options.root,
     mode: 'production',
     logLevel: 'warn',
     configFile: false,
     plugins: [cloudflare({ configPath: wranglerInputPath, viteEnvironment: { name: 'worker' } })],
     resolve: {
       alias: [
         { find: /^react-native\/Libraries\/.*/, replacement: resolvePath('@vxrn/vite-plugin-metro/empty', options.root) },
         { find: 'react-native/package.json', replacement: resolvePath('react-native-web/package.json', options.root) },
         { find: 'react-native', replacement: resolvePath('react-native-web', options.root) },
         { find: 'react-native-safe-area-context', replacement: resolvePath('@vxrn/safe-area', options.root) },
       ],
     },
     build: { outDir, emptyOutDir: false },
   })
   const workerEnv = builder.environments.worker
   if (!workerEnv) throw new Error('[one] plugin did not register "worker" environment')
   await builder.build(workerEnv)
   ```

   Reason you need `createBuilder` not `build()`: calling `build()` invokes the plugin's `builder.buildApp` hook, which tries to build a client SPA env too, which fails with `Cannot resolve entry module index.html` because One's client build is separate (done by vxrnBuild earlier in the pipeline).

4. Update the test fixture setup file:
   ```
   # tests/test-cloudflare/setup.ts
   # change workerFile path from `dist/worker.js` to `dist/worker/index.js`
   # change wrangler dev --config from `dist/wrangler.jsonc` to `dist/worker/wrangler.json`
   # remove the `dist/worker.js` positional arg to wrangler dev (plugin's wrangler.json sets main)
   ```

5. Rebuild and run:
   ```
   cd ~/one && bun run build --filter=one --filter=vxrn --force
   cd tests/test-cloudflare && rm -rf dist && bun run build:web
   bun run test
   ```

You should see 25/27 green, with 2 failures:
- `should navigate from SSG to dynamic route` (playwright)
- `should navigate between dynamic routes` (playwright)

Both time out on `page.waitForFunction` because `/dynamic/*` server-side renders return empty bodies.

Confirm the server-side failure directly:
```
cd tests/test-cloudflare
bunx wrangler dev --port 3457 --config dist/worker/wrangler.json &
sleep 8
curl -sS http://localhost:3457/dynamic/456 -w " [HTTP %{http_code}]\n"
# expect: empty body, HTTP 200
# wrangler log has: TypeError: Cannot read properties of null (reading 'useContext')
```

## Historical attempts that didn't fix the dispatcher theory

- `inlineDynamicImports: true` on the worker's rolldown output config — single worker.js, single React instance. Bug persists.
- `ssr.target: 'webworker'` on the server build pass in vxrn — so the pre-built server chunks don't emit `createRequire(import.meta.url)` wrappers. Fixes axios/date-fns bundling but doesn't fix the dispatcher issue. (Separately, `target: 'webworker'` with a single `input: 'virtual:one-entry'` disables code-splitting in vite → `moduleIdToServerChunk` maps all routes to the same chunk → `loaderPath: ""` in buildInfo → needed to explicitly force `rolldownOptions.output.codeSplitting: true` to work around.)

## Historical dispatcher investigation ideas

1. **Does `react-dom/server.renderToString` actually run for the dynamic route path?** The error says dispatcher is null when the hook runs. The dispatcher is *set* as a side effect of `renderToString`. If render never starts — if the page component is instantiated before render opens — hooks would fire against a null dispatcher. Add logging to `packages/one/src/server/workerHandler.ts` around line 424 (`const rendered = await render!(renderProps)`) to confirm render is called; log the result (maybe it resolves to undefined, which would be why the body is empty).

2. **Is the failure specifically in layout loader resolution?** There's a warning in the wrangler logs: `[one/worker] no lazy route for ./_layout.tsx`. This happens because `buildInfoForWriting.routeToBuildInfo` doesn't include the layout as a standalone entry, so it's not in `lazyRoutes.pages`. The layout loader lookup fails silently and caches null — so far so good. But dynamic routes have a layout chain (`./_layout.tsx` → `./dynamic/[id]+ssr.tsx`) and static routes like `/ssr-page` also have a layout. If the failure is specific to layout handling on dynamic routes, check `workerHandler.ts` lines 290-400.

3. **Compare the chunks side-by-side.** Dynamic route chunk (`dist/worker/assets/_id__ssr-*.js` when the plugin is active) imports `require_react` from a chunk named `react-dom-*.js`. Static SSR chunk (`dist/worker/assets/ssr-page_ssr-*.js`) does NOT import `require_react` directly — it relies on `require_jsx_runtime` from `jsx-runtime-*.js`. The dynamic route chunk pulls in extra React APIs (`useContext`, `forwardRef`, `Children.toArray`, `use` hook via `import_react[" use ".trim().toString()]`) because it inlines `@radix-ui/react-slot`'s Slot component (used by `Link`). **But /ssr-page also uses `Link`** — so why doesn't it inline the Slot code? Answer that question, you may find the chunking quirk that matters.

4. **Try building api/middleware from source inside the worker env (Option Z).** Right now we pre-build api/middleware in passes 2/3 and the plugin re-bundles the output. What if the worker env's input is `_worker-src.js` that statically imports the source files (`import './app/api/hello+api.ts'`) and the plugin bundles them fresh? That sidesteps the "plugin re-bundles pre-compiled chunk" question entirely.

   File the `/Users/n8/one/packages/one/src/cli/build.ts` plan: in the `cloudflare` case, SKIP `buildCustomRoutes` entirely when using the plugin. Generate `_worker-src.js` with imports against the source `app/**/*.tsx` files. Let the plugin bundle everything. Update `buildInfoForWriting` lazy-import paths to point at chunk paths the plugin emits (you'll need to collect rolldown output chunk info via a custom plugin hook).

5. **Check if the bug exists when the plugin builds something WITHOUT re-bundling One's pre-built chunks.** Create a minimal repro: a tiny worker that imports `react` + `react-dom/server` + does a `renderToString(<ComponentThatUsesUseContext/>)`. If that repros outside One, file a bug with the plugin. If it doesn't repro, the bug is specifically about re-bundling pre-compiled ESM chunks.

6. **unenv polyfill interaction with react-dom/server.** unenv provides Node.js API polyfills. `react-dom/server` uses `node:stream`, `node:async_hooks`, etc. Check `/Users/n8/one/node_modules/unenv/dist/runtime/node/internal/` for what's polyfilled vs proxied. Maybe react-dom/server's dispatcher setup relies on a synchronous code path that unenv breaks.

7. **Test with `@cloudflare/vite-plugin` playground examples.** Clone `cloudflare/workers-sdk`, run one of their playground apps that has SSR + dynamic routing (TanStack Start integration is at `packages/vite-plugin-cloudflare/playground/tanstack-start`). See if dynamic-route SSR works there. If yes, compare their config/setup to ours.

## Constraints / gotchas

- **Don't push to main.** Use a side branch.
- **Don't `gh run watch`** (60/hr rate limit). Share the CI URL and move on.
- **`bun release --into <dir>`** to ship changes into `~/chat`, `~/takeout-free`, `~/takeout` for downstream validation. Note: `bun install` in those directories will overwrite the released `one` with the npm version from the lockfile. If you need `@cloudflare/vite-plugin` to exist alongside your released `one`, you must also `cp -R ~/one/node_modules/@cloudflare ~/chat/node_modules/` after releasing (and repeat each time you re-release, because `bun install` wipes it).
- **`~/chat` has e2e tests against prod** with a rich api surface — after you solve the bug and re-integrate the plugin, release into `~/chat` and run their e2e suite as the final validation. Chat's `vite.config.ts` may currently have `build.server.unified: true` set from an earlier trial (check `git status`).
- **Don't introduce `noExternal: true` as a runtime "fallback".** If the plugin works, commit to it; if not, revert it. Don't ship both paths.
- **`tests/test-cloudflare/tests/cloudflare.test.ts`** has a test asserting `find_additional_modules: true` and specific ESModule glob rules in the generated wrangler config. The plugin strips `find_additional_modules` and emits `no_bundle: true` + `rules: [{type: 'ESModule', globs: ['**/*.js','**/*.mjs']}]` instead. If you make the plugin work, this test needs updating (see the diff in PR #698's earlier commits for the exact shape).
- **`ssr.target: 'webworker'` + single input disables code-splitting.** If you re-introduce the webworker target on the main server build, also set `rolldownOptions.output.codeSplitting: true` explicitly or per-route server chunks collapse into one file and `serverJsPath` for every route becomes `dist/server/_virtual_one-entry.js`.

## Success criteria

These are now met in the branch:

1. `tests/test-cloudflare` → 27/27 with the plugin in place
2. `tests/test-build-unified` → 22/22 with `axios` and `date-fns` tests un-skipped
3. No regression in the repo-wide `bun run test` run (`26 successful, 26 total`)
4. Downstream validation in a real app remains the main follow-up item

## File references

Primary:
- `/Users/n8/one/packages/one/src/cli/build.ts` lines 1299-1450 — the `case 'cloudflare'` block, where the plugin integration lives
- `/Users/n8/one/packages/one/src/server/workerHandler.ts` — the runtime request handler, where the render error surfaces
- `/Users/n8/one/packages/vxrn/src/exports/build.ts` — the SSR server build pass, which produces the chunks the worker pass later imports

Fixtures:
- `/Users/n8/one/tests/test-cloudflare/` — canonical CF fixture, 27 tests, playwright-based
- `/Users/n8/one/tests/test-build-unified/` — the new unified-mode fixture from PR #698, 22 tests

Plugin source (for reading):
- `/Users/n8/one/node_modules/@cloudflare/vite-plugin/dist/index.mjs` — compiled plugin (easier to grep than cloning workers-sdk)
- `https://github.com/cloudflare/workers-sdk/tree/main/packages/vite-plugin-cloudflare` — plugin source if you need to read TypeScript

Docs:
- PR #698: `https://github.com/onejs/one/pull/698`
- Cloudflare plugin: `https://developers.cloudflare.com/workers/vite-plugin/`
- Env API: `https://vite.dev/guide/api-environment.html`

## Start here

If someone picks this back up, the next useful work is downstream validation rather than core branch debugging:

1. Release the branch into a real Cloudflare app with CJS-heavy deps (`3pc`, `chat`, etc.)
2. Verify build + deploy + runtime behavior there, not just in the fixtures
3. Only revisit the historical React dispatcher theory if a real plugin-enabled repro appears again
