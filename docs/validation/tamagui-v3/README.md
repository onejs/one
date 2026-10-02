# Tamagui v3 site validation

2026-10-01. Branch: `v2-site-tamagui-v3`. **Pixel comparison is not clean. No merge to v2-beta.** Nate subsequently requested a yellow menu; other differences remain unresolved below.

## Dependencies and design values

**TESTED:** all 128 reachable Tamagui packages resolve `3.0.0-beta.1479.1`. There is one physical path each for tamagui, core and web. See `resolved-graph.json` and `resolve-graph.mjs`. Root tamagui is bumped because the site resolves its root installation. No override forces v3 onto fixtures. Fixture manifests are unchanged; `v2-fixtures.json` proves the six explicitly pinned fixtures still resolve tamagui/core/web 2.6.2.

**TESTED:** `themes-preserved.json` records byte-identical v5 theme exports. `fonts-preserved.json` records font values equal to v2 after removing true aliases and token sigils. Existing token scales, media, CSS animations and camel-case theme names remain. The named control sizing ladder preserves the site's physical control sizes. There is no Config v6 remap.

**RAN:** the npm registry returned HTTP 404 for lucide-icons-2 at this exact beta. The 21 used generated glyphs are retained locally with their MIT license and use v3 helpers-icon and SVG packages. Token-sized icons retain their measured pixels because v3 uses font tokens instead of shape tokens. No v2 icon package remains in the site graph.

## Codemod and removed APIs

**RAN:** the exact beta codemod ran in report mode, then `--write`, with `--source-semantics v2-pixels`. The initial report records 257 sites, 29 flagged rows and 13 warning rows. Legacy shorthand keys were normalized before the second write; `codemod-audit.json` records each flagged/warning row's disposition. Final report: zero remaining sites, flags, warnings, ignored files, Sheet.Frame sites or legacy transitions. The report inventories legacy syntax; it does not prove visual parity.

The migration handles themeInverse, fullscreen, focusable, Sheet anatomy, named containers, token stepping, styleable, animated-number driver hooks and transition properties. Component line heights use explicit pixels; font configuration numbers retain pixel semantics. Responsive font variants, spread precedence and removed implicit font defaults were checked with browser probes and preserved explicitly where needed.

Guide: `origin/v3/site-docs-pass`, commit `cacf31e0ccc635280ad79515b02270dc1ff4bb7a`, `code/tamagui.dev/data/docs/guides/how-to-upgrade.mdx`.

## Upstream font-weight fix

**TESTED:** a responsive size variant overrode a later authored static fontWeight, unlike a static size variant. The test failed first with 600 instead of 300. Upstream branch: `v3/fix-responsive-variant-precedence`; commit `7559440948f17d7f982f8a984dc732c8e4c8c917`.

The fix marks base variant records and removes only their earlier records for a later authored property, retaining authored conditional clauses. It scans the existing records for that property. The 27 focused tests and core web suite passed: 676 tests across 95 files, with the existing 3-test/2-file skips unchanged. Focused format/lint passed. Full Tamagui lint/check remains limited by untouched formatting failures and a missing root CLI binary. No Tamagui v3-beta/main push or publish occurred.

**RAN:** `bun release --into` exercised the source branch downstream. That worktree has old declaration artifacts; final validation retained published beta types and fixed JS. The exact-version Bun patch now carries the same upstream source and compiled web/native fix. A fresh frozen package install reproduced getSplitStyles.mjs SHA256 `b6ae9a6cf5fe6fd1cfbe09b0ff750883f8d1fa47b5ab779b9daae709957cc7b4`, equal to the source build. The patch affects only web at this beta, leaving v2 untouched.

## Checks and capture limits

**RAN:** the site typecheck and gated `bun run site:build` pass, including 167 static pages and the bundle secret scan. A separate root monorepo typecheck invocation failed in unchanged v2 fixture configs; a green full-monorepo check is not claimed.

**TESTED:** 32 before/after headless Chromium captures cover home, docs index, introduction, routing, native overview, components-Tabs, version-two blog and menu at 1440/390, light/dark, DPR 1. Fonts/images are ready and animation is disabled. The strengthened capture checks actual menu hit-testing. Mobile and desktop menu links both navigated to Installation and rendered its H1.

The extra `/docs` index capture is an existing server error in both versions: useLoader returns undefined in DocCorePage. HTTP 200 and zero browser pageerrors did not detect it. The capture tool now records `serverError`; those four frames are excluded from successful visual checks. All four requested docs content pages rendered normally.

Baseline capture: `9a90b4e54eefecd4de695d48c817420f86cb0a76`. The branch incorporates v2-beta through `15ef1d2ef0200`; intervening changes did not touch site files.

## Differences and disposition

RGB pixels are compared without a tolerance. Different dimensions are padded with contrasting colors. `pixel-diff.json` records counts, dimensions and bounds. Percentages are changed area, not severity.


| Page | 1440 light | 1440 dark | 390 light | 390 dark | Height change |
| --- | ---: | ---: | ---: | ---: | --- |
| home | 0.024% | 0.065% | 2.421% | 2.485% | 2245 to 2245, 3360 to 3370 |
| intro | 0.026% | 0.026% | 0.722% | 0.722% | 2686 to 2686, 3985 to 3985 |
| routing | 4.015% | 3.920% | 11.920% | 12.307% | 6452 to 6450, 8550 to 8526 |
| native | 0.000% | 0.000% | 0.283% | 0.283% | 2708 to 2708, 3508 to 3508 |
| components | 0.248% | 0.248% | 1.454% | 1.455% | 3231 to 3231, 3935 to 3935 |
| blog | 0.389% | 0.389% | 0.905% | 0.905% | 7464 to 7464, 12401 to 12401 |
| menu | 15.526% | 15.526% | 79.987% | 79.985% | 1000 to 1000 |
| docs | 0.000% | 0.000% | 0.000% | 0.000% | 1000 to 1000, 3875 to 3875 |

**TESTED, intended menu change:** gray surface becomes yellow. Popover.ScrollView passes through under Adapt, avoiding a collapsed nested scroller. Desktop retains the original percentage flex basis, the Sheet overlay retains full opacity, the trigger has its original transparent border and the arrow has its measured 13px size. Neutral section tabs and flat mobile corners remain. Roughly 7px horizontal content offsets remain alongside the intended theme changes; exact menu parity is not claimed.

**TESTED, unresolved routing compatibility:** the horizontal scroller viewport remains 338px, but its inner row grows from 338px to 552.1875px and its label column from 130px to 161.453125px. This changes clipping, text positions, wrapping and following vertical positions. `/docs/routing` reproduces the measured case under the same config. **INFERRED:** `scroll-view-repro.tsx` extracts the minimal layout; it has not been independently exercised. Whether the intrinsic sizing change is a bug or an intended v3 contract change is unresolved. No fixed-width site workaround was added.

**TESTED, unresolved inline reflow:** desktop native-overview is pixel-identical; mobile differs around inline namespace text at y=1821 through 1894. Introduction and components-Tabs retain their page heights, with residual inline code/link wraps and list endings. Blog heights match after explicitly retaining the 32px responsive intro line height. Some inline code breaks differently: the measured mobile `one run:android` code occupies two fragments instead of one despite equal font size, line height, padding and display; its following paragraph retains the same y position. **GUESSED:** changed inline boundaries may explain these residuals; the cause is unproven.

**RAN, unresolved home:** desktop primary text retains its 300 weight and page height. Residual pixels lie in lower social/team regions and dark-theme link colors. Mobile has a 10px lower-page height difference beginning around the feature/social area. These remain unclassified, not accepted as a redesign.

## Reproduction and artifacts

From the repository root:

```sh
bun install --frozen-lockfile
node docs/validation/tamagui-v3/resolve-graph.mjs apps/onestack.dev /tmp/graph.json
bun run --cwd apps/onestack.dev dev --port 4317
# in another terminal; set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH if needed
node docs/validation/tamagui-v3/capture.mjs http://localhost:4317 /tmp/after
node docs/validation/tamagui-v3/diff.mjs /tmp/before /tmp/after /tmp/diff
```

Raw lossless captures and diffs are at `/tmp/one-site-v3-evidence/{before,after-verified,diff-verified}`. The close-out comparison is `menu-yellow-complete.webp` there. No permanent site probe route was added. Both branches are pushed; no v2-beta merge, publish or release occurred.
