# One native bars: tinted glass buttons, bottom toolbars, double bars

**Recommendation (INFERRED):** no new bar system. Every bar One draws on iOS goes through
a system navigation container, because those are the only bars iPhone Duo moves into its
side column. That means `UINavigationController` and `UITabBarController` in UIKit, and
equally `NavigationStack`, `NavigationSplitView` and `TabView` in SwiftUI: SwiftUI bars
do adapt on Duo, and Apple's guidance names the SwiftUI API beside the UIKit one at
every step. What does not adapt is a bar built outside a container (a bare `UIToolbar`,
`UINavigationBar` or `UITabBar`) or a floating view drawn to look like one. One already
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

## What Apple's Duo page changes (RAN: page data fetched and read in full)

Source: `designing-for-iphone-duo`, new on September 9, 2026. Six of its rules land on
this API directly, and two of them are places where Expo's shape is not enough.

1. **"Group related toolbar items instead of spacing them manually."** Groups made with
   `ToolbarItemGroup` or `UIBarButtonItemGroup` get their spacing from the system and
   adapt as space changes, "so avoid adding fixed spacing yourself". Expo has `Spacer`
   and no group. One adds `Stack.Toolbar.Group` as the primary way to cluster items and
   keeps `Spacer` for Expo code and for the flexible gap between a leading and a
   trailing cluster. **GUESSED:** `UIBarButtonItemGroup` applies to the bottom toolbar
   in the 27.1 SDK as it does to the navigation item; B1 reads the 27.1 headers on
   pro-64 before choosing the native mapping.
2. **"Provide both a title and a symbol for each toolbar item that isn't text-only."**
   The system uses the title in overflow menus and expanded forms. `Button` and `Menu`
   types require a title whenever `icon` is set (Expo's children text is the title). An
   icon with no title is a type error and a dev-time throw, since it breaks only on
   Duo, where nobody will notice until it ships.
3. **"Keep text-based buttons to a minimum."** Items with text stay in a horizontal bar
   and do not move to the side. Documented, not enforced.
4. **Overflow order.** Items overflow bottom to top by default; each item or group can
   take a visibility priority (`ToolbarItemVisibilityPriority`,
   `UIBarButtonItemVisibilityPriority`). The primary action (Compose, New Note) and
   badged items stay longest. One adds `visibilityPriority` on `Button`, `Menu` and
   `Group`, with Apple's values.
5. **Which bar gives way.** Navigation-focused views push toolbar items into overflow
   and keep the tab bar, the default; task-focused views minimize the tab bar instead
   (`ToolbarVerticalCompressionBehavior`, `UIVerticalBarCompressionBehavior`). One adds
   it as a prop on `Stack.Toolbar`, named after Apple's type once B1 reads the exact
   spelling from the SDK. This document earlier called it `toolbarCompressionBehavior`
   from Contrast's notes; the page's names win.
6. **"Use the system overflow menu"** and "reserve the ellipsis symbol for overflow".
   One does not draw its own overflow. Extra overflow-only actions go through
   `ToolbarOverflowMenu` / `additionalOverflowItems` as `Stack.Toolbar.Overflow`. The
   docs tell people not to use `ellipsis` as a menu icon.

Also from the page, for the docs: do not override the default bar placement; controls
that belong to a leading pane stay with that pane; a full-width layout with no bars is
fine for immersive screens; the side bar stays on the same physical side in
right-to-left languages, which is one more reason `leading` and `trailing` describe the
navigation bar only.

Items 1, 4, 5 and 6 are 27.1 SDK symbols and One's CI builds with Xcode 26.4. They go
in behind a Swift compiler version check so the 26.4 build is unchanged, and the JS
props are accepted and ignored below iOS 27. B1 takes the compiler version from
pro-64's Xcode 27.1. **GUESSED** until that build runs.

## The one rule

A control that should adapt to Duo is declared as a bar item or a tab, never drawn as a
floating view. `One.iOS.Button buttonStyle="glassProminent"` is for buttons that belong
to the content and should stay with it. The docs say this in the first paragraph of the
toolbar section, because it is the choice that decides whether an app looks right on
the new phone.

## API

`Stack.Toolbar` follows Expo's `Stack.Toolbar` exactly, so a move from expo-router is an
import change. Decided at review from the owner's "keep Expo compat where Expo is
right": `placement` is Expo's `'left' | 'right' | 'bottom'`, default `'bottom'`, with no
`leading` or `trailing` spelling. The Expo facts below come from the design review
(a5330), which read Expo's types; the `expo-router` package is not installed on this
machine, so B1 re-reads them before copying a name.

```tsx
<Stack.Toolbar>                               // placement defaults to 'bottom'
  <Stack.Toolbar.Button icon="square.and.arrow.up" onPress={share}>Share</Stack.Toolbar.Button>
  <Stack.Toolbar.Menu icon="slider.horizontal.3" title="Filter">
    <Stack.Toolbar.MenuAction icon="trash" destructive onPress={remove}>Delete</Stack.Toolbar.MenuAction>
  </Stack.Toolbar.Menu>
  <Stack.Toolbar.Spacer />                    // flexible; width={n} makes it fixed
  <Stack.Toolbar.Button icon="plus" variant="prominent" tintColor="#ff2d55" onPress={add}>
    New
  </Stack.Toolbar.Button>
</Stack.Toolbar>
```

**One form.** The slot components from `76d75d742` (`Stack.Toolbar.Leading`,
`.Trailing`, `.Left`, `.Right`, `.Bottom`, `.Item`) are removed. They shipped only to
the beta line. `systemImageName` is renamed to `icon` on `Stack.Toolbar`, with no alias;
it stays on the low-level `One.iOS.ToolbarItem`, which keeps UIKit's vocabulary.

**Where each placement goes in One's code.** `bottom` goes through One's `ToolbarHost`,
which sets the screen controller's `toolbarItems`. `left` and `right` go through
react-native-screens header items (`unstable_headerLeftItems`,
`unstable_headerRightItems`, `stackToolbarDescriptors.ts:494,503`). **INFERRED:** both
end up as items of a real `UINavigationController`, which is what Apple's rule asks
for, but only the bottom path is One's own native code; the header path is
react-native-screens' and its Duo behaviour is theirs to get right. B3 checks both.

**Mapping, Expo prop to native prop:**

| Expo (`Stack.Toolbar.*`) | native | note |
| --- | --- | --- |
| `Button icon` (SF Symbol string or image source) | `systemImageName` or `image` | an `Icon` child is the same thing |
| `Button` text children, or a `Label` child | `title` | required whenever `icon` is set, per Apple's Duo rule 2 above |
| `Button variant`: `'plain'` (default), `'done'`, `'prominent'` | `barButtonItemStyle` | native enum gains `done` (`UIBarButtonItem.Style.done`); `prominent` is iOS 26 |
| `Button tintColor`, `hidden`, `disabled`, `selected` | same | |
| `Button hidesSharedBackground` | `hidesSharedBackground` | |
| `Button separateBackground` (default false) | `sharesBackground = !separateBackground` | Expo's name wins on `Button` |
| `Spacer sharesBackground` | `sharesBackground` on the spacer item | Spacer only, as in Expo |
| `Spacer`, `Spacer width` | `type: 'fluidSpacer'`, `'fixedSpacer'` | |
| `Badge` child | `badgeConfiguration` | see below |
| `MenuAction isOn` | `selected` | |
| `MenuAction destructive`, `subtitle` | `destructive`, the existing `description` field renamed `subtitle` | |
| `Menu inline`, `MenuAction keepsMenuPresented` | the matching `UIMenu.Options.displayInline` and `UIMenuElement.Attributes.keepsMenuPresented` | the menu layer already keeps menus open for toggles (`plans/one-native-coverage.md`) |
| `SearchBarSlot` | `type: 'searchBar'` | kept, bottom only, since the native item type exists |

**Badge.** Expo allows `Badge` in `left` and `right` only and calls bottom an iOS
limitation. One's native item sets `UIBarButtonItem.badge` wherever the item is. B2
proves on the iOS 26.4 simulator whether a badge renders on a bottom `toolbarItems`
item. If it does, One allows it and the docs mark it as an intended difference from
Expo. If it does not, `Badge` under `bottom` throws in dev, and Track A asserts its
badge on a `right` item instead.

Beyond Expo, from Apple's Duo page: `Stack.Toolbar.Group`, `visibilityPriority`,
`Stack.Toolbar.Overflow`, and the compression prop on `Stack.Toolbar`. These are
additions and change nothing Expo code relies on.

Excluded for now: `Stack.Toolbar.View` (arbitrary React Native content in a bar item;
it does not go vertical on Duo, so it waits for a real need) and `Label` styling.

### Tabs

One `Tabs` is React Navigation 8's bottom tabs on react-native-screens
(`packages/one/src/layouts/Tabs.tsx:19`), and Expo's `NativeTabs` is a JSX trigger form
over the same react-native-screens primitives (**RAN:** Expo's page fetched and read).
The pixels are the same either way, so `Tabs` keeps React Navigation's option names and
gains no second spelling. The owner's direction holds: nothing here replaces React
Navigation or react-native-screens.

| need | One `Tabs` today (React Navigation 8 option) | Expo `NativeTabs` |
| --- | --- | --- |
| minimize on scroll | `tabBarMinimizeBehavior: 'auto' \| 'none' \| 'onScrollDown' \| 'onScrollUp'` | `minimizeBehavior` |
| bar above the tabs | `bottomAccessory: ({ placement }) => node` | `NativeTabs.BottomAccessory`, `usePlacement()` |
| detached trailing tab | `tabBarSystemItem: 'search'`; the team's pattern overrides its icon with a plus | `role="search"` |
| badge, tint, SF Symbol icon | `tabBarBadge`, `tabBarActiveTintColor`, `tabBarIcon` | `Badge`, `tintColor`, `Icon sf` |

**RAN:** the three option names and the accessory's `placement` of `regular` or `inline`
are read from the installed `@react-navigation/bottom-tabs` `8.0.0-alpha.50` types
(`lib/typescript/src/types.d.ts:191,234,256-267`), not from Expo's page.

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
- **Track C, button above the bar.** A probe first, on the iOS 26.4 simulator in light
  and dark, kept apart from Track B (no accessory, no minimize). The screen is a stack
  inside a tab with a bottom toolbar of one flexible spacer and one prominent tinted
  item. Two controls are captured beside it: the same toolbar on a stack outside any
  tab, and the same screen with the spacer removed. Measured from the captures and
  quoted in the hand-off: the glass capsule's width and height in points, its gap to
  the tab bar's top edge, and whether the tab bar's frame moved compared with a tab
  that has no toolbar. **Stop rule:** it is a recipe only if the capsule is one
  item wide (under 80pt), sits above the tab bar with a visible gap, and the tab bar's
  frame is unchanged. Anything else is reported with the numbers and the work stops;
  the fallbacks are the `tabBarSystemItem: 'search'` swap the team already uses and a
  button inside `bottomAccessory`, and neither needs new API. On Duo a flexible spacer
  collapses to zero size, so what remains is the single prominent item, which Apple's
  ordering puts at the bottom of the column as the primary action.

## Duo

**Open question the Duo run must answer (GUESSED either way):** SwiftUI bars adapt when
the SwiftUI container is the app's navigation structure. `One.iOS.Tabs` is a SwiftUI
`TabView` hosted inside a React Native view, and nobody has checked whether the system
still treats an embedded `TabView` as a participating container. B3 runs a
`One.iOS.Tabs` fixture on the Duo simulator beside the three tracks. If it does not
move to the side, `One.iOS.Tabs` is documented as not Duo-ready and `Tabs` from `one`
is the recommended path.

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

1. **B1 `Stack.Toolbar` surface.** Everything in the mapping table, plus `Group`,
   `visibilityPriority`, `Overflow` and the compression prop behind the compiler check.
   What breaks, all in the same change: `stack-utils/__tests__/toolbar.test.tsx` is
   rewritten for the new components; the slot components and their types are deleted
   (`StackToolbarLeading`, `StackToolbarTrailing`, `StackToolbarItem`,
   `StackToolbarBottom` and the `Left`/`Right` aliases in `Stack.tsx:147-150`); the
   "Toolbar Composition API" section of `components-Stack.mdx:184-202` and the toolbar
   reference in `native-features.mdx` are rewritten; `systemImageName` becomes `icon`.
   Confirms Expo's prop names against installed types first.
2. **B2 fixtures.** Tracks A and B with suites and negative controls, and the Track C
   probe with its capture in the hand-off.
3. **B3 Duo run.** The three fixtures on the Duo simulator on pro-64, closed and open,
   captures compared against the expectations above. Findings go back to this
   document.
4. **B4 docs.** The toolbar section of `native-features.mdx` rewritten around the one
   rule, the three recipes, and the `Tabs` options.

Routing and navigation chrome are on the always-review list, so B1 is reviewed by
another model before it lands.
