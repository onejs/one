# Vite 8.1 `experimental.bundledDev` (FullBundleDevEnvironment) + One

Status: **renders/hydrates behind an opt-in flag, but HMR is broken** — editing any
file crashes the dev server (upstream vite 8.1.0 `invalidateModule` recursion; see Known
limitations). Initial-load + navigation work; live editing does not. Enable with:

```ts
one({ web: { experimentalBundledDev: true } })
```

Dev-only (serve); ignored for builds and non-web environments. Validated on
`examples/one-basic`: homepage renders + hydrates, client `<Link>` navigation and
browser back/forward work, **zero console errors**. Existing plugin tests pass
(virtualEntryPlugin, fileSystemRouterPlugin) and normal (unbundled) dev is unaffected
(the new code paths are all gated on `isBundled` / the option).

The separate Vite 8.1 + Rolldown 1.1.2 **upgrade** is on branch `vite-8.1-upgrade`
(CI green); this bundled-dev support sits on top of it.

## What it does / why it's a win
Single rolldown-powered bundle for the web client instead of unbundled ESM dev:
~4× fewer requests, faster parse, big for apps with large icon/util imports
(e.g. lucide). Verified in a plain-Vite bench (42 lucide icons, assets inlined).

## The four problems that had to be solved (all One-specific; plain Vite is fine)
1. **Asset imports dropped.** rolldown's native asset path drops default-import asset
   specifiers (`import x from './a.png'`) from raw-bundled node_modules deps under
   One's client env — binding elided, usage kept → `X is not defined`
   (`@react-navigation/elements` icon Assets). NOT fixable via `moduleTypes`. Fix: a
   `transform`-stage inliner (`one:web-bundled-asset`) rewrites such imports to
   data-uris — transform() DOES run in the FullBundleDev pipeline.
   → `plugins/bundledDevPlugin.ts`
2. **Barrel re-export linking.** rolldown 1.1.0 defaulted `lazyBarrel` ON, which breaks
   One's `index.mjs` barrel re-exports under FullBundleDev (`Slot` resolved to a bare
   undefined instead of the real `Slot$1`). Fix: `experimental.lazyBarrel: false` on the
   client build rolldownOptions. → `plugins/bundledDevPlugin.ts`
3. **Missing exports.** With lazyBarrel off, react-native packages importing native-only
   exports (`codegenNativeComponent`, `TurboModuleRegistry`, …) from react-native →
   react-native-web (which lacks them) fail the build. Fix: `shimMissingExports: true` on
   the client build rolldownOptions (matches what the dep optimizer already does).
   → `plugins/bundledDevPlugin.ts`
4. **React-refresh preamble.** In bundled mode `/@vite/client` and `/@react-refresh`
   aren't standalone modules, so `/@one/dev.js` (which imports them) fails to load and
   `$RefreshReg$` never installs → every compiler-wrapped route module throws "preamble
   was not loaded". Fixes:
   - install the preamble in the bundled client *entry* body (runs before lazily-globbed
     route modules; `one`/`/@react-refresh` aren't refresh-wrapped). → `virtualEntryPlugin.ts`
   - drop `/@vite/client` from preloads in bundled mode (it 404s). → `fileSystemRouterPlugin.tsx`
   - stub `/@vite/client` + `/@react-refresh` imports in `/@one/dev.js` so the devtools
     script doesn't take itself down. → `devtoolsPlugin.ts`

## Files
- `plugins/bundledDevPlugin.ts` (new) — the asset inliner + the `config()` that turns on
  `experimental.bundledDev` and the client `build.rolldownOptions` (entry input,
  lazyBarrel off, shimMissingExports, asset plugin).
- `one.ts` — wires `bundledDevPlugin(!!options.web?.experimentalBundledDev)`.
- `types.ts` — `web.experimentalBundledDev?: boolean`.
- `virtualEntryPlugin.ts`, `fileSystemRouterPlugin.tsx`, `devtoolsPlugin.ts` — the
  preamble / preload / devtools fixes above (all gated on bundled mode).

## tamagui.dev validation (2026-06-23)
Linked local One 1.20 into `~/tamagui2` via `bun release --into ~/tamagui2` (1.16.4→1.20)
and ran `BUNDLED_DEV=1 bun run dev` on `~/tamagui2/code/tamagui.dev` (flag added to its
`web` config, gated on `process.env.BUNDLED_DEV`). **Homepage + /community + /docs are
clean on a true cold load** (renders, hydrates, refresh installed, zero console/page errors,
full styling — playwright headless, fresh server each time). Three issues surfaced; two fixed.

5. **SSR/client asset divergence (FIXED).** The client asset inliner (problem 1) only ran
   on the client, so SSR emitted the original asset URL (`<img src="/features/.../mj.jpg">`)
   while the client emitted a data-uri → that URL 404s under FullBundleDev **and** the two
   differ → React hydration mismatch. Fix: run the same inliner on the `ssr` env too, via a
   top-level `transform` on the bundled-dev plugin (the rolldown client plugin can't reach
   the ssr pipeline). Now both sides emit identical data-uris. → `plugins/bundledDevPlugin.ts`

6. **Cold-first-compile root-layout crash (FIXED — in tamagui, not One).** Every route's
   first cold load threw `Cannot read properties of undefined (reading 'jsxDEV')` into the
   error boundary. The jsxDEV message was a *symptom*: an instrumented cold load showed the
   layout factory registered its `default` export then **threw before** the
   `react/jsx-dev-runtime` init line, so React rendered `Layout` with the (var-hoisted, still
   undefined) jsx runtime. The real throw was `TypeError: Illegal invocation` from
   `createTamagui → configureMedia → setupMediaListeners → getMatch`. `@tamagui/web`'s
   `helpers/matchMedia.ts` exports the *unbound* native fn:
   `(typeof window !== 'undefined' && window.matchMedia) || matchMediaFallback`, and
   `getMatch = () => matchMedia(str)`. Normal bundlers compile that named-import call to the
   `(0, ns.matchMedia)(str)` detached form (this=undefined → sloppy → window, works);
   rolldown's bundled-dev interop compiled it `ns.matchMedia(str)` (this = module namespace)
   → native matchMedia throws. Fix: `window.matchMedia?.bind(window)` in `matchMedia.ts` —
   defensively correct under any bundler. → `~/tamagui2/code/core/web/src/helpers/matchMedia.ts`
   (+ dist esm/cjs for local testing). **Should be committed/upstreamed in tamagui proper.**

## Known limitations (acceptable for experimental; future work)
- **Cross-blob cold race on heavily-lazy-split routes (OPEN, low severity).** `/takeout` has
  a `React.lazy` 3D component (`TakeoutBox3D`) wrapped in its own error boundary that, on a
  cold first load, throws `Cannot convert undefined or null to object` from the runtime's
  `__toCommonJS(undefined)` — a CJS dep referenced before its init across concurrently-loading
  lazy blobs that share `__rolldown_runtime__.modules`. Only that box fails; the rest of the
  page renders, and a reload fixes it (warm is clean). This is a genuine FullBundleDev
  experimental-mode concurrency issue (not cleanly reachable from One/tamagui — the throwing
  `__toCommonJS` lives in the generated rolldown runtime). A null-safe `__toCommonJS` or less
  aggressive lazy-splitting would address it.
- **HMR is BROKEN in bundled mode and crashes the dev server (OPEN, blocker for daily use —
  upstream vite 8.1.0 bug).** Live-tested 2026-06-23 (playwright, edit `HomeHero.tsx`
  "Write less", browser connected, no reload): the edit (1) never applies to the DOM — Fast
  Refresh does not work — and (2) crashes the whole dev server a few seconds later with
  `RangeError: Maximum call stack size exceeded`, exit code 7. Root cause is a stock vite
  8.1.0 bug in `DevEnvironment.invalidateModule` (`vite/dist/node/chunks/node.js:34276`):
  ```js
  invalidateModule(m, _client) {
    if (this.bundledDev) { this.invalidateModule(m, _client); return; }  // self-recurse → stack overflow
    ...                                                                   // real HMR logic only on the non-bundledDev path
  }
  ```
  Any HMR invalidation in bundledDev mode self-recurses forever. Confirmed contrast: NORMAL
  (unbundled) dev on the same vite 8.1 branch applies the edit to the DOM and the server
  stays up (Fast Refresh works, 0 errors). With no browser attached, the edit does NOT crash
  the server — the crash needs a connected client to send the invalidate over `/__vxrnhmr`.
  So earlier "Fast Refresh works" notes were wrong: only the *mechanism* (preamble + per-module
  wrappers) was confirmed present, never a live edit. Fix is upstream in vite (the bundledDev
  branch must call the real invalidation, not itself); One could patch-package it to make
  bundled-dev HMR usable at all. One's own `createHotContext` route/loader/css/cursor channels
  are additionally a no-op in bundled mode (need `import.meta.hot` wiring), but that's moot
  until the vite recursion is fixed.
- FullBundleDev re-bundles the reachable graph per lazy route (`/@vite/lazy` ≈ multi-MB
  per route) — fine functionally, a perf characteristic of the experimental mode.
