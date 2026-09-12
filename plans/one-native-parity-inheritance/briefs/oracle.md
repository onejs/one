Build a real-device geometry oracle for the SwiftUI floating tab bar, across a matrix, so rnx
(soot's browser-native RN simulator) can pin its FloatingTabBar against measured numbers instead
of a single three-tab reading.

## Why this exists

rnx draws its own iOS 26 tab bar in
`/Users/n8/soot/packages/sootsim-engine/src/ios/FloatingTabBar.tsx`. Its geometry constants come
from one capture of one fixture with three main tabs plus a search tab. I found one place that is
already wrong because of that (lines 128-131): when a search-role tab exists, `tabTrackWidth` has
no `tabCount` term, so the main capsule is pinned to a constant 281pt and tabs just split it
thinner. On a real device the pill shrinks to fit its tabs and the detached capsule holds a fixed
trailing margin instead.

RAN, my evidence, two captures from the fixture you are about to extend, same fixture, one
variable (how many tabs stay in the main pill), both with a detached search capsule:
  /tmp/one-native-actiontab/04-action-tab.png   main pill: First + Second; action tab detached
  /tmp/one-native-actiontab/05-search-role.png  main pill: First only;     Second detached
  detached capsule  x 294.5..355.0pt, centre 324.8pt   IDENTICAL in both
  first tab's ink   x  37.5..56.5pt                    IDENTICAL in both
Under rnx's model the first tab's centre must move ~65pt between those two. It moves zero.

Nobody can fix that properly without an oracle at more than one tab count. That is your job.

## What to produce

A machine-readable geometry table, committed to the repo, that for each matrix cell records
measured points at 393x852:
  - main capsule rect
  - detached capsule rect (when present), plus its gap from the main capsule and its trailing margin
  - per-tab glyph ink box and label box, and each tab's centre
  - badge rect when present
  - the selection indicator rect
Plus the captures it was measured from, and a short doc saying how each number was obtained.

JSON, one object per cell, keyed by a stable cell id. r27161 (session slug `rnx-pixel-conformance`,
owns the rnx engine lane in ~/soot) is the consumer; write it for them, not for yourself.

## The matrix - this is the point, do not ship three cells

Vary, and cross where it is meaningful rather than exhaustively:
  - page tab count: 1, 2, 3, 4, 5
  - detached tab: none / a `role="search"` page tab / an action tab (`onPress`, no children) with
    `role="search"`. The action-tab combination never enters routed selection
    at all, so rnx has no model for it.
  - badge: absent / short ("5") / wide ("NEW") / overflow ("999+")
  - systemImage present vs a title-only tab
  - title length: short, and long enough to truncate
  - `tabBarMinimizeBehavior`: every value the generated enum accepts (read
    `packages/one-native/src/generated/` and `assertSwiftUIValue('TabBarMinimizeBehavior', ...)`
    in `packages/one-native/src/Tabs.native.tsx`; do not guess the value list)
  - `sidebarAdaptable`: false and true
  - appearance: light and dark
  - selected index: first, middle, last
Use judgement on the cross product: full crossing is thousands of cells. Vary one axis at a time
off a baseline, then add the handful of crossings where you expect interaction (tab count x
detached tab, badge width x tab count, long title x tab count). Say in the doc which crossings you
chose and why the ones you skipped cannot interact.

## Method, non-negotiable

- The accessibility tree publishes ONE `Tab Bar` group node (x16 w361 y753 h83) and no per-tab
  entries. Every number here has to come from pixels.
- Measure capsule edges by the shadow-then-rim signature: luminance dips into the drop shadow and
  then spikes above the interior. Brightness alone finds the white page card instead. Working
  example: `/private/tmp/claude-501/-Users-n8--worktrees-one-native/5bdbcde5-ff88-4612-97d9-1bae07a94d80/scratchpad/capsules.ts`.
  Decode PNGs with `tests/native-features/scripts/visual-pixel-gate.ts`'s `readPng`; sharp is not
  installed.
- Before each measurement, name the independent variable and what a null result would prove. A
  check that cannot fail is not a check, and one that cannot pass is equally broken.
- Cross-check at least one number per cell by a second method that shares no step with the first
  (e.g. glyph ink bounding box vs capsule rim trace). Report both, and report disagreements rather
  than picking the nicer one.
- Label every causal claim RAN / TESTED / INFERRED / GUESSED. Relay never upgrades.
- State the fixture offset caveat loudly: the tab bar sits inside a bordered container in this
  fixture, so absolute x values are NOT comparable to a full-screen oracle. Relationships between
  cells are comparable because the container does not move. If you can make the fixture render the
  tab bar full-screen for the oracle cells, that is strictly better - do it and say so.

## Where

Worktree `/Users/n8/.worktrees/one-native`, branch `feat/one-native`.
  fixture: `tests/native-features/app/one-native.tsx`
  suite:   `tests/native-features/scripts/one-native-conformance.ts`
  visual:  `tests/native-features/scripts/visual-declarations.ts`, `visual-pixel-gate.ts`
  dev server: `bun run dev --port 8107` from `tests/native-features` (NOT `PORT=8107`)

## Two phases, because I am still using the checkout

PHASE 1, start now: read the fixture, the suite script and the pixel helpers, and build your
measurement tool in your own scratchpad. Do NOT edit anything under `/Users/n8/.worktrees/one-native`
yet and do NOT touch simulator `36CB8903-C59C-4438-BA29-E7A3C8876C37` - a 12-suite conformance pass
is running on it right now and an edit under `tests/native-features` hot-reloads the app out from
under it.

PHASE 2: I will message you when the pass is done and pushed, and the worktree and that simulator
are yours. Create your OWN simulator for any parallel work before then if you want one; there are
many spare `iPhone 16-Conformance-*` devices, all Shutdown.

Build/install notes: RN Fabric codegen is regenerated by `pod install`, not by a plain build, and
CocoaPods needs `export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`. Build and run with
`xcodebuildmcp simulator build-and-run --workspace-path ios/OneNativeTests.xcworkspace --scheme
OneNativeTests --simulator-id <id>`. Prefer the `xcodebuildmcp-cli` skill over hand-rolled
xcodebuild/simctl.

## You do NOT own

- `~/soot` and anything in it, including `FloatingTabBar.tsx`. r27161 owns that lane. You produce
  the oracle; they consume it. Do not edit soot, do not open a soot branch.
- The one-native commit and push. I am doing that.
- Any release, tag, publish, or npm workflow. Not authorized, do not ask.
- Other sessions' work, main, or Metro CI.

## Reporting

REVIEW: none - reviewed as part of the assembled rnx tab bar conformance matrix.

Report back to me (session r26032) when the table exists and is committed: the cell count, the
axes you varied, the crossings you chose and skipped, the numbers that disagree with rnx's current
constants, and any axis you could not measure and why. Do not send progress updates. Do not spawn
a reviewer.
