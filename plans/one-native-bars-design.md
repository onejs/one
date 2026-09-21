# One native bars: tinted glass buttons, bottom toolbars, double bars

**Recommendation (INFERRED):** no new bar system. Every bar One draws on iOS goes through
the two containers Apple manages, the navigation controller and the tab bar controller,
because those are the only bars iPhone Duo moves into its trailing column. One already
does this underneath. What is missing is small: `Stack.Toolbar` does not expose the
prominent (tinted glass) style, spacers or badges that its own native layer has, and
none of the three bar patterns has a conformance fixture. Keep Expo's `Stack.Toolbar`
shape, which is mostly right, and fix the two places it is not.

Scope: a written design against One `origin/v2-next` at `7767a3d31` and Contrast main at
`f613cc2abd`. Nothing was built or run on a device.

## Answers to the owner's questions

- **Is `Stack.Toolbar` really about a stack?** It is about a screen, but the bar is owned
  by the navigation controller around that screen. UIKit shows a bottom toolbar only
  from `viewController.toolbarItems` inside a `UINavigationController`, and SwiftUI's
  `.bottomBar` placement needs a `NavigationStack`. So the component is declared per
  screen and needs a native stack screen above it, even a stack of one screen inside a
  tab. The name is honest; keep it.
- **Is `placement="bottom"` how the interesting native UI happens?** Yes. On iOS 26 the
  navigation controller's toolbar is the floating Liquid Glass bar. Items share one
  glass capsule, a spacer splits the capsule into separate clusters, and an item can be
  prominent and tinted.
- **Are tinted glass buttons official?** The linked post is a designer's concept with
  mockups and names no API (**RAN:** fetched and read). The effect itself is official on
  iOS 26: `UIBarButtonItem.Style.prominent` plus `tintColor` for bar items, and
  `.buttonStyle(.glassProminent)` plus `.tint` for a SwiftUI button. Nothing needs
  inventing.
- **The button above the bar.** **GUESSED:** what the owner saw is a navigation
  controller toolbar inside a tab bar controller. UIKit stacks that toolbar directly
  above the tab bar, and with one flexible spacer and one prominent item it reads as a
  tinted floating action button over the tabs. It is container managed, so Duo pins it
  to the bottom of the column, which is where Apple puts Compose and New Note. Track C
  below proves or kills this on the simulator before any API is written for it.

## Evidence

- **RAN (read):** One's bottom toolbar is container managed. `ToolbarHostView.swift`
  builds `UIBarButtonItem`s, assigns them to the screen's controller and calls
  `navigationController?.setToolbarHidden` (`packages/native/ios/Toolbar/ToolbarHostView.swift:57,85`).
- **RAN (read):** the native item already supports the tinted style:
  `barButtonItemStyle: 'plain' | 'prominent'`, `tintColor`, `sharesBackground`,
  `hidesSharedBackground`, `badgeConfiguration`, `selected`, and
  `type: 'normal' | 'fixedSpacer' | 'fluidSpacer' | 'searchBar'`
  (`packages/native/src/toolbar/types.ts:23-48`), mapped to `.prominent` behind an
  iOS 26 availability check (`ToolbarItemView.swift:264-270`).
- **RAN (grep):** `Stack.Toolbar` exposes none of `prominent`, spacer or badge.
  `stackToolbarDescriptors.ts` and `StackToolbarBottomHost.tsx` have zero matches for
  `prominent`, `barButtonItemStyle`, `variant`, `spacer`, `badge`. Its shape today is
  `Stack.Toolbar` > `Leading | Trailing | Bottom` > `Item | Menu`.
- **RAN (read):** `One.iOS.Button` already takes `buttonStyle="glassProminent"` and
  `tint` (`packages/native/schema.json:2624-2631`, iOS 26 cases `glass` and
  `glassProminent`). Tinted glass buttons in screen content work today.
- **RAN (read):** the double bar already works through One `Tabs`. Contrast's Apple
  Music demo passes `bottomAccessory: ({ placement }) => <MiniPlayer />` and
  `tabBarMinimizeBehavior: 'onScrollDown'` as React Navigation 8 options
  (`~/contrast/demos/apple-music-native/app/(tabs)/_layout.tsx:7,11`). One's own docs
  and types do not mention either option (**RAN:** zero matches for `bottomAccessory`
  under `packages/one/src`).
- **RAN (fetched):** Expo's `Stack.Toolbar` is `placement: 'left' | 'right' | 'bottom'`
  with children `Button`, `Menu`, `MenuAction`, `Spacer`, `View`, `Label`, `Badge`,
  `Icon`, `SearchBarSlot`; bottom placement is allowed only in page components.
  **GUESSED (from memory, package not installed here):** its button also takes
  `variant: 'plain' | 'done' | 'prominent'`, `tintColor`, `hidesSharedBackground` and
  `separateBackground`. The worker confirms against the installed `expo-router` types
  before copying any name.
- **RAN (read, Contrast's Duo research quoting Apple's HIG and Tech Talk 111462):** "Only
  container-managed bars participate": `UINavigationController` and
  `UITabBarController`; "content from sub-components like UIToolbar, UINavigationBar,
  or UITabBar won't be considered". Symbol items go vertical and text items stay
  horizontal. Groups keep their grouping. Flexible spacers become zero size, fixed
  spacers keep their size. The primary action is last into overflow. The tab bar's
  bottom accessory stays a horizontal bar and never enters the column. Compression is
  chosen with `toolbarCompressionBehavior`, a 27.1 SDK symbol
  (`~/contrast/plans/sootsim/duo-control-mapping.md:100-163,238`).

## The one rule

A control that should adapt to Duo is declared as a bar item or a tab, never drawn as a
floating view. `One.iOS.Button buttonStyle="glassProminent"` is for buttons that belong
to the content and should stay with it. The docs say this in the first paragraph of the
toolbar section, because it is the choice that decides whether an app looks right on
the new phone.

## API

Keep Expo's names so a move from expo-router is an import change. Two corrections:

```tsx
<Stack.Toolbar placement="bottom">          // 'leading' | 'trailing' | 'bottom'
  <Stack.Toolbar.Button icon="square.and.arrow.up" onPress={share} />
  <Stack.Toolbar.Menu icon="ellipsis">
    <Stack.Toolbar.MenuAction icon="trash" destructive onPress={remove}>Delete</Stack.Toolbar.MenuAction>
  </Stack.Toolbar.Menu>
  <Stack.Toolbar.Spacer />                   // flexible; width={n} makes it fixed
  <Stack.Toolbar.Button icon="plus" variant="prominent" tintColor="#ff2d55" onPress={add}>
    <Stack.Toolbar.Badge>3</Stack.Toolbar.Badge>
  </Stack.Toolbar.Button>
</Stack.Toolbar>
```

1. **`placement` is `'leading' | 'trailing' | 'bottom'`.** Apple names bar positions by
   reading direction, and One's current slots already do. Expo's `'left'` and `'right'`
   are accepted as spellings of the same two values so Expo code runs unchanged; the
   docs and types show only the direction-aware names.
2. **One form.** The slot components landed in `76d75d742`
   (`Stack.Toolbar.Leading`, `.Trailing`, `.Bottom`, `.Item`) are replaced by
   `placement` and `Button`. They shipped only to the beta line. Two ways to declare
   the same bar is the thing to avoid.

Additions, each a pass-through to a prop the native item already has:

| JSX | native prop | Apple API |
| --- | --- | --- |
| `variant="prominent"` | `barButtonItemStyle` | `UIBarButtonItem.Style.prominent` |
| `tintColor` | `tintColor` | `UIBarButtonItem.tintColor` |
| `Spacer`, `Spacer width` | `type: 'fluidSpacer' \| 'fixedSpacer'` | `.flexibleSpace()`, `.fixedSpace(_:)` |
| `Badge` | `badgeConfiguration` | `UIBarButtonItem.badge` |
| `sharesBackground`, `hidesSharedBackground` | same | same |
| `selected`, `hidden`, `disabled` | same | same |

Excluded for now: `Stack.Toolbar.View` (arbitrary React Native content in a bar item;
it does not go vertical on Duo, so it waits for a real need), `Label` styling, and
`toolbarCompressionBehavior`, which cannot compile until One's CI Xcode has the 27.1
SDK (the superset track pins the SDK ceiling at 26).

### Tabs

One `Tabs` is React Navigation 8's bottom tabs on react-native-screens
(`packages/one/src/layouts/Tabs.tsx:19`), and Expo's `NativeTabs` is a JSX trigger form
over the same react-native-screens primitives (**RAN:** Expo's page fetched and read).
The pixels are the same either way, so `Tabs` keeps React Navigation's option names and
gains no second spelling. The owner's direction holds: nothing here replaces React
Navigation or react-native-screens.

| need | One `Tabs` today (React Navigation 8 option) | Expo `NativeTabs` |
| --- | --- | --- |
| minimize on scroll | `tabBarMinimizeBehavior: 'onScrollDown'` | `minimizeBehavior` |
| bar above the tabs | `bottomAccessory: ({ placement }) => node` | `NativeTabs.BottomAccessory`, `usePlacement()` |
| detached trailing tab | the search system item; the team's pattern swaps its icon for a plus | `role="search"` |
| badge, tint, SF Symbol icon | `tabBarBadge`, `tabBarActiveTintColor`, `tabBarIcon` | `Badge`, `tintColor`, `Icon sf` |

The work is documenting and typing these in One's docs, where none of them appears
today, plus the Track B fixture. Two things Expo documents apply to One as well and go
in the docs: the accessory renders twice (regular and inline), so its state lives
outside it, and a `FlatList` does not drive minimize on scroll.

The optional road away from React Navigation already exists as the platform-direct
`One.iOS.Tabs` (SwiftUI `TabView`, with `role` and `tabBarMinimizeBehavior`,
`packages/native/src/Tabs.native.tsx:27-114`). It lacks `tabViewBottomAccessory`. Adding
that is a later catalog item and is what would make `One.iOS.Tabs` able to carry the
double bar without React Navigation; it is not part of today's work.

## The three tracks

Each track is one fixture in `tests/native-features/fixtures/` with a suite entry, which
is also the oracle Contrast's peach case is graded against. One owns the fixture and the
simulator captures; Contrast owns the peach case.

- **Track A, action bar in clusters.** A stack screen whose bottom toolbar has a plain
  cluster, a flexible spacer, and a prominent tinted item with a badge. Asserts: item
  labels in the accessibility tree, the prominent item's tint through the pixel gate,
  two separate glass capsules (a gap of background pixels between them), each
  `onPress` reported in a status label. Negative control: without the spacer the pixel
  gap assertion fails.
- **Track B, double bar.** `Tabs` with a `bottomAccessory` and
  `tabBarMinimizeBehavior="onScrollDown"`. Asserts: the accessory is above the tab bar
  at rest, reports `placement` `regular`, then `inline` after a scroll, and the tab bar
  minimizes. This is the Apple Music shape and only needs the fixture and docs.
- **Track C, button above the bar.** A stack screen inside a tab, with a bottom toolbar
  of one flexible spacer and one prominent tinted item. **This is a probe first:**
  capture it on the iOS 26.4 simulator and look at it. If it reads as a floating
  tinted button above the tab bar, it becomes a documented recipe with no new API. If
  it does not (the toolbar draws a full-width capsule, or pushes the tab bar), report
  the capture and stop; the fallback candidates are the search-role tab swap the team
  already uses and a button inside `bottomAccessory`, and neither needs new API either.

## Duo

**INFERRED:** because all three tracks use container-managed bars, Duo's column comes
from rebuilding against the 27.1 SDK, with no One code. Apple states the opt-in is the
rebuild. The proof is running the three fixtures on the iPhone Duo simulator, which
exists only on pro-64 (Xcode 27.1, iOS 27.1 runtime, per
`~/contrast/plans/sootsim/conformance/duo-column-conformance.md`). Expected from
Apple's rules, to be checked against the captures: Track A's items stack vertically
with the spacer collapsed and the prominent item last into overflow; Track B's tab bar
moves to the column and the accessory stays horizontal; Track C's button pins to the
bottom of the column. One's CI stays on Xcode 26.4, so the Duo run is a manual gate on
pro-64 and not a CI suite until the pin moves.

## Slices

1. **B1 `Stack.Toolbar` surface.** `placement`, `Button`, `Spacer`, `Badge`, `variant`,
   the pass-through props, removal of the slot components and their docs, the
   descriptor tests in `stack-utils/__tests__/toolbar.test.tsx` updated. Confirms
   Expo's prop names against installed types first.
2. **B2 fixtures.** Tracks A and B with suites and negative controls, and the Track C
   probe with its capture in the hand-off.
3. **B3 Duo run.** The three fixtures on the Duo simulator on pro-64, closed and open,
   captures compared against the expectations above. Findings go back to this
   document.
4. **B4 docs.** The toolbar section of `native-features.mdx` rewritten around the one
   rule, the three recipes, and the `Tabs` options.

Routing and navigation chrome are on the always-review list, so B1 is reviewed by
another model before it lands.
