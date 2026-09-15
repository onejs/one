# Status — one-native + rnx tab bar conformance

## Waiting on you

1. **A machine for native calibration that is not pro-64.** r27161 has asked three times.
   Admitting pixel baselines is blocked until it has one. This is the only hard blocker.
2. **`tabBarMinimizeBehavior` and `sidebarAdaptable` do not exist in rnx at all.** No match
   across 769 lines of `FloatingTabBar.tsx`; `packages/compat/src/registry.ts:969` and `:984`
   list both under `missing`. We ship both in one-native. Implement them in rnx, or leave them
   on the missing list?
3. **Six or more tabs.** The device folds the overflow into a `More` tab and drops the detached
   capsule entirely. rnx keeps five slots beside a detached capsule. We measured the bar-level
   geometry but not what is inside `More`. Build the overflow model, or document the divergence
   and move on?

## Done and pushed

- **`2a517c932`** — action tabs for `Swift.Tabs`. `<Swift.Tab onPress role="search" />` with no
  children runs an action, never becomes the selection, and detaches into its own capsule.
  12/12 suites green, 18/18 visual.
- **`c1c777007`** — the geometry oracle: 44 cells, full-screen fixture, iPhone 16 393x852 @3x,
  iOS 26.4. Table, captures, method doc and a driver that re-derives without re-capturing.

## What the conformance work actually found

rnx was sizing the tab bar **by tab count**. The device sizes it **by content**. Three tabs is
the only count where the two agree, which is why a suite that pins stroke widths to 0.33pt never
caught it.

| | device | rnx before |
|---|---|---|
| pill width N=1..5, no detached tab | 102, 188, 274, 351, 351 | 120, 204, 288, 372, 390 |
| pill with a search tab | grows: 102, 188, 281, 281 | constant 290 |
| detached capsule on selection | 62x62, fixed x | grew to 72 and slid left |
| icon-only glyph | centred in the capsule | 8pt high |
| badge from glyph ink centre | 8.6pt | 13.5pt |
| indicator insets | 5.2 / 5 / 2.8 | 10 / 4 / 6 |
| label text | changes pitch and pill width | ignored entirely |
| six tabs | folds into `More` | no overflow model |

The label row is the one that changed the shape of the fix. rnx had
`// equal width per tab — text content must not influence sizing`, so we checked whether the
device agreed. It does not: at two tabs, short labels give pitch 86 and a 188pt pill, long ones
give pitch 150 and a 316pt pill. A long label does not truncate, it overlaps its neighbour. That
ruled out a lookup table and forced a measuring model.

Three checks also turned out to be unable to fail — `SegmentedControl` `trackFill`, Picker
selected-item paint, and `ExpoPasteInput` field text each passed on a red or blank screen. Fixed,
each with a negative control.

## Who is on what

- **r27161** (`rnx-pixel-conformance`) — wave 8 closed, six commits, one review by a different
  model. Owns the rnx engine lane. Holding baseline admission on the machine question.
- **r28205** (`swiftui-tabbar-oracle`) — delivered the oracle. Now collapsing a wart it found in
  our own harness: `dismissWarning` had three exit paths contributing 0, 1 or 2 checks, so the
  suite's check count depended on whether a dev warning happened to be on screen, and on the
  zero-check path nothing asserted that no overlay was intercepting taps.
- **r28262** — wave 8 review, stopped.

## In flight

Verifying r27161's last commit before I push it to soot main. Pushing soot main triggers four
release workflows, so I am proving its three red checks are pre-existing rather than taking the
report on trust. So far every failure names a file the commit never touched, and two resolve
against `/Users/n8/soot/node_modules` from inside a worktree, which is a resolution artifact
rather than a real break. Running the same checks without the commit to confirm.

## Corrections I owe

My published receipt of "432 accessibility checks" is environment-dependent — the same run
reports 430 or 432. Real number goes into the handoff and to r28162 once r28205's fix lands.
