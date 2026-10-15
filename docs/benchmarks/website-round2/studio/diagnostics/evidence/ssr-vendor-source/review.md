# Review: 5ae371c95097f8cdf20797b743f1a9054b7d09ac on tm/one-ssr-vendor-confirmation

Verdict: **APPROVE** (code readiness; separate from any broad speed claim)

## What I checked
- RAN the diff: base 13e6ab192, 2 files. `getOptimizeDeps.ts:57` filters
  `@vxrn/vendor/react*` out of the forced include spread only; `needsInterop`
  is returned and merged unchanged (lines 127, 138; mergeUserConfig.ts:106),
  and the config reaches only SSR (getAdditionalViteConfig.ts:24,
  defaultDepOptimizePlugin.ts:39, getViteServerConfig.ts:55). The vendor ids
  are not added to `exclude`, so a user include can still force them.
- INFERRED from builtInDepPatches.ts:78-81,178-184: patched React 18 entries
  (`react`, jsx runtimes, `react-dom`, client, server.browser, test-utils)
  require the vendor ids under the `vxrn-web` condition that real SSR sets
  (getBaseVitePlugins.ts:58), and those react entries stay in include, so the
  vendor is reached transitively exactly when a patched app needs it.
- RAN once in packages/vxrn: `bun run test src/config/ssrVendorOptimization.test.ts
  src/config/getOptimizeDeps.test.ts src/utils/scanDepsToOptimize.test.ts`
  -> 3 files, 13 tests pass. The new test does a real Vite SSR hook render:
  ordinary React loads zero vendor modules, patched wrappers render `ready`
  and load vendor modules. Installed runtime here is 19.2.3.
- RAN a read of the local evidence: runtime-diff.json shows 6931 files with
  exactly the 4 getOptimizeDeps compiled/map files changed; summary.json has
  quiet=false, and production results.json shows 6 pages, no errors, theme
  retained, 0 native bytes. Navigation and HMR evidence files exist as briefed;
  I did not re-run them.

## Defects
None blocking. No behavior, HMR, theme, or native contract change is in the
diff scope.

## Misstated claim to correct before citing the numbers
The paired RSS medians (-75.8 MiB ready, -56.9 MiB collected) match
summary.json, and every **tree RSS** phase is lower in all 3 pairs. "Every
memory phase lower in all 3 pairs" is not true for heap: collected heap is
slightly higher in all 3 pairs (+0.3 to +0.7 MiB) and other heap phases are
mixed. Scope the claim to RSS. Startup faster in all 3 pairs is accurate;
page timings are mixed, as briefed. These are 3 direct local (non-quiet)
pairs on one host and app, not a universal claim.

## Limits
- The patched fixture stamps real 19.2.3 runtimes as 18.3.1 and applies the
  string wrapper bytes; function-valued prod entry patches are skipped. It
  proves the vxrn-web SSR serve path this config governs, not a genuine
  React 18 runtime or the prod VXRN_REACT_19 eval entries.
- Only `react` + `react-dom/server.browser` entries are exercised; jsx,
  compiler-runtime, and client entries share the same wrapper mechanism but
  are untested.
- The baseline "21 unneeded vendor loads" failure is the author's RAN claim;
  I did not re-run the reverted baseline.

## Owed simplification (non-blocking, author may fold into a later cleanup)
Name the vendored ids once (e.g. a `vendoredReact` array composed into
`needsInterop`) instead of a string-prefix filter, so a future vendor entry's
interop-only vs forced-root intent is explicit where it is declared. No DRY
merge beyond that is owed by this commit.

Counterfactual that would change this verdict: patched SSR failing to render
or loading no vendor, ordinary React 19 loading any vendor module, or the
filter also removing the ids from needsInterop.
