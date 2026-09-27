# One native components lane (iOS)

Owner lane: the SwiftUI views and building blocks `One.iOS` still lacks. Scope is
views, controls and containers matching SwiftUI exactly; system service APIs
(`One.iOS.<Service>`), Swift/Kotlin import, Android, the Contrast migration and
Peach's Expo UI coverage belong to other lanes. Work lands on `v2-beta`.

## Where the gap is

`bun run coverage` (packages/one) at 94bd0b18e: 520 of 522 public `View`
modifiers are bound, so modifiers are done. Views are the gap. The report counts
only catalog leaves (34); containers such as `List`, `ScrollView`, `Form`,
`NavigationStack` and `ZStack` are bound by hand in `emitContainers.ts` and are
not counted. After removing both, the SwiftUI views an app builds screens from
that One cannot express:

| view | kind | notes |
| --- | --- | --- |
| `TextEditor` | leaf, controlled text | multi-line input; the one missing core control |
| `PasteButton` | leaf, action | pastes without the system paste prompt |
| `MultiDatePicker` | leaf, controlled set | calendar with several dates |
| `LinearGradient`, `RadialGradient`, `AngularGradient`, `EllipticalGradient`, `MeshGradient` | fill leaves | gradients as views, like the shape leaves |
| `UnevenRoundedRectangle`, `ConcentricRectangle` | fill leaves | finish the shape family |
| `LazyVGrid`, `LazyHGrid` | containers | `GridItem` columns as data |
| `Grid`, `GridRow` | containers | two-dimensional static layout |
| `GroupBox` | container | labeled card |
| `GlassEffectContainer` | container | iOS 26 glass merging for several `Glass` |
| `ViewThatFits` | container | first child that fits |

Out of scope unless an app needs it: `Table` (iPad), `NavigationSplitView` and
`NavigationLink` (navigation is One's, see `one-native-coverage.md`),
`TimelineView`/`Canvas` (closures over native state), document and scene types.

The previously bound but unexercised `EditButton` and `EmptyView` now have
focused suites. All four `TabViewSlot` names now have iPhone or iPad proof.
`ZStack`, `Spacer`, `LabeledContent`, and `Glass` now have an iOS 27 family
suite, as do `ShareLink`, `ContentUnavailableView`, `PhotosPicker`, and
`WebView`. A suite per remaining family closes these.

## Partial screen-building behavior

**RAN, 2026-09-26:** the current `v2-beta` sources already bind tab sections,
bottom accessories, customization, sheet fitting, selected detents, presentation
background and sizing, list row modifiers, `refreshable`, and `searchable`; the
older expansion matrix in `plans/one-native-coverage.md` predates those bindings.
The remaining partial surfaces are:

| family | partial or missing behavior | priority |
| --- | --- | --- |
| menus and context menus | data-driven items work; primary actions, context previews, and a Picker embedded in menu content are not represented | after core views |
| pickers | standalone controls work; `navigationLink` and `palette` Picker styles are rejected without their native container context | after core views |
| popovers | trigger and React Native presentation body work; `attachmentAnchor` is not bound | after core views |
| navigation | `NavigationStack` and toolbars exist; `NavigationSplitView` and `NavigationLink` are outside this lane because One owns routed navigation | coordinate before admission |
| list editing | `EditButton` label toggles Edit/Done; `List` edit state has no independent observer and delete/move row actions are unavailable | after core views |

## Order

1. `TextEditor` and `UnevenRoundedRectangle`: controlled multiline input and
   four independent corner radii, with the `editors` simulator suite.
2. Grids: `LazyVGrid`, `LazyHGrid`, `Grid`, `GridRow`.
3. Remaining leaves: `PasteButton`, `MultiDatePicker`, gradients, and
   `ConcentricRectangle`, prioritizing controls used to build screens.
4. `GroupBox`, `GlassEffectContainer`, `ViewThatFits`.
5. Suites for the bound-but-unexercised views, grouped by family.

Each slice: catalog or container entry, `bun run generate`, README section in
`src/platform/README.md`, a fixture and suite in `tests/native-features`, a run
on a compatible iOS 27 simulator with the output quoted in the commit.
One high review per assembled batch (`tm run --group lg` while the Claude
accounts are unavailable).

## Status

- **RAN, 2026-09-27:** `MultiDatePicker` is implemented on named branch
  `one-native-multi-date-picker` pending Nate's approval of the public
  `readonly string[]` `YYYY-MM-DD` calendar-day API. Apple binds a
  `Set<DateComponents>`; One converts sorted date-only strings at the native
  boundary. On an iPhone 17 Pro iOS 27 simulator, the focused suite passed
  22 checks for measured SwiftUI calendar layout, native day selection
  pixels, adding and removing a day, React rejection, external selection,
  disabled tap with a post-tap pixel capture, and revision reset. The fixture
  chooses days 10–12 of the current calendar month so future runs remain on
  the visible month. The
  simulator capture and outcome are in local ignored
  `tests/native-features/build/multi-date-calendar-gregorian-proof-3` and
  `multi-date-buddhist-locale-proof`. The Buddhist simulator presented
  “September 2569 BE” while the React value stayed `2026-09-DD`; both
  22-check suites passed. Native build used Xcode 27.1 on ci-64. High review
  s465 found a non-Gregorian conversion bug, force unwrap crash paths, a
  type-incorrect docs example, and incomplete disabled/metadata/coverage
  evidence; the follow-up branch commit corrected each and records device,
  OS, Xcode, locale, calendar, appearance, source SHA, and observed month.
  A follow-up review s469 found omitted era data for calendars with repeating
  year numbers. Commit `80c3b4621` preserves the native era for Chinese,
  Dangi, Japanese, and Republic of China calendars. **RAN, 2026-09-27:** the
  Xcode 27.1 iOS 27 simulator build succeeded and both Buddhist and Republic
  of China 22-check suites passed on that exact source revision. The Republic
  of China month read “September 115 Minguo” while React still held
  `2026-09-DD`. A Foundation round-trip probe passed 1911/1912, 1966, and
  2026 dates for Chinese, Dangi, Japanese, and Republic of China calendars.
  The boundary dates have no SwiftUI UI proof; other calendars remain partial.
  Nate's approval of the public date-only API remains before merge.

- **RAN, 2026-09-26:** slice 1 `TextEditor` and `UnevenRoundedRectangle` passed
  `generate:check`, all seven shape tests, and the `editors` conformance suite
  on the iPhone 17 Pro iOS 27.0 simulator. The suite checked native multiline
  input, React acceptance and rejection, external updates, revision reset,
  frame size, and both corner arrangements with screenshot pixels. Screenshots
  and the machine-readable trace live in the local `tests/native-features/build/editors-proof`
  artifact directory; that directory is not a committed source artifact.
- **RAN, 2026-09-26:** slice 2 `LazyVGrid`, `LazyHGrid`, `Grid`, and `GridRow`
  passed an arm64 iOS 27 simulator build and the `grids` conformance suite on
  iPhone 17 Pro. The suite checked native fixed/flexible columns, fixed rows,
  a spanning footer, a nested button action, React child reordering, and a
  signed spacing update. iOS 27 reduced the row gap to zero for `-8` spacing.
  The trace and screenshots are in the local ignored
  `tests/native-features/build/grids-proof` artifact directory. The review
  also led to runtime validation of TextField, SecureField and TextEditor
  keyboard options before they cross the native bridge.
- **RAN, 2026-09-26:** slice 3 begins with `PasteButton` for String payloads.
  The iPhone 17 Pro iOS 27 simulator mounted SwiftUI's system button, wrote
  text through `One.Clipboard`, tapped the button, and received the string in
  one React `onPaste` array callback. On an erased simulator the empty
  pasteboard still left the system button enabled but emitted no String paste.
  The extended suite covers quotes, newline and emoji, the `disabled` prop,
  and repeat delivery. The arm64 build, `generate:check`, and
  native coverage snapshot passed. Proof screenshot is in the local ignored
  `tests/native-features/build/paste-button-proof` artifact directory. The
  exact final binary includes an encode-failure guard added after the first
  passing simulator run. **RAN, 2026-09-26:** the final binary also passed the
  full `paste-button` suite on an iPhone 17 Pro iOS 27 simulator on ci-64,
  including disabled suppression and repeat delivery.
- **RAN, 2026-09-26:** `GroupBox` landed on `v2-beta` at `3870f568d` after
  `generate:check`, 39 JS tests, a successful arm64 build, and all seven
  `group-box` checks on an iPhone 17 Pro iOS 27 simulator. The suite covers
  labeled and unlabeled boxes, measured child bounds, a native child button,
  and a React-driven label update.
- **RAN, 2026-09-26:** `ConcentricRectangle` passed `generate:check`, nine
  shape tests, an arm64 iOS 27 simulator build, and the full `editors` suite.
  In a SwiftUI capsule container, its blue center and white rounded corner
  differ from the blue square corner of a `Rectangle` control. The screenshot
  is in the local ignored `tests/native-features/build/concentric-proof` directory.
- **RAN, 2026-09-26:** `GlassEffectContainer` passed `generate:check`, 41
  focused JS tests, an arm64 iOS 27 build, and the `glass-container` suite.
  Native screenshots show separate capsules at zero spacing and merged glass
  at 60; the suite also exercised omitted and signed spacing, a composed
  button action, and measured height. Screenshots are in the local ignored
  `tests/native-features/build/glass-container-proof` directory.
- **RAN, 2026-09-26:** `FullScreenCover` and `ContextMenu` passed the
  `cover-context` suite on the iPhone 17 Pro iOS 27 simulator. The suite
  checked full-screen React content geometry, dismissal callbacks, the
  closed-state controls, long press versus tap, native Copy and Pin delivery,
  menu reopening, and outside-tap dismissal. The reopened menu screenshot
  shows iOS's Pin checkmark; iOS 27 does not expose it as an accessibility
  value. Screenshots and trace are in the local ignored
  `tests/native-features/build/cover-context-proof` directory.
- **RAN, 2026-09-26:** `ViewThatFits` passed SDK 27.1 `generate:check`, 26
  focused JS checks including native coverage regeneration, an arm64 iOS 27
  simulator build, and the iPhone 17 Pro `view-that-fits` suite. At 180 points
  it selected the compact child; at 340 it selected the first wide child; at
  80 it showed the last child when neither fit. The suite also checked an
  explicit 70-point height proposal, vertical and both-axis choices, omitted
  axes, composition inside a native Host, and child actions into React. The
  high review found and we fixed a measured-height override of explicit
  height, plus missing fallback and nested cases. Screenshots and trace are in
  the local ignored `tests/native-features/build/view-that-fits-v2-proof`
  directory.
- **RAN, 2026-09-26:** the `building-blocks` suite passed on iPhone 17 Pro
  iOS 27. It measured `ZStack` at 220×80 with the overlaid button inside
  its bottom-trailing edge; a 60-point HStack width reduction was absorbed by
  `Spacer`; React updated the value within a native `LabeledContent` row;
  and tapping the `Glass` child reached React. A two-color backdrop proved
  that regular glass softened the contrast and `identity` restored it. The
  high review identified weak geometry and direction assertions; all four
  were strengthened before the final passing simulator run. The coverage
  snapshot was regenerated with `vitest run src/nativeCoverage.test.ts -u`.
  Screenshots and trace live in the local ignored
  `tests/native-features/build/building-blocks-proof` directory.
- **RAN, 2026-09-26:** the `share-empty` suite passed on iPhone 17 Pro iOS 27.
  The SwiftUI `ShareLink` opened Apple's activity sheet for text, a URL string
  shared as text, and the same string shared as a URL. Each Copy started from
  a seeded pasteboard: text Copy included the item and message; URL-type Copy
  exposed only the message through the text pasteboard, while the sheet showed
  the `onestack.dev` link preview. The native ShareLink disabled and rejected
  a tap. `ContentUnavailableView` measured at the assigned 260-point height
  and full inset width, contained its image and both buttons, and changed its
  title and description after Retry before Dismiss restored them. Both action
  ids reached React. The high review led to the negative control, pasteboard
  seed, native geometry assertions, and React update proof. A dedicated
  fixture prevents the coverage snapshot from claiming nearby PhotosPicker
  and WebView. The final screenshot and trace are in the local ignored
  `tests/native-features/build/share-empty-final-proof` directory.
- **RAN, 2026-09-26:** the `web-photos` suite passed on iPhone 17 Pro iOS 27.
  It loaded two local HTML documents into SwiftUI `WebView`, received each
  title, `about:blank` navigation, settled progress, and a new loading event
  on the React-driven swap. The proof matched each document's distinct HTML
  background color as well as a change in more than half the WebView pixels.
  The suite seeds a known HEIC image in the simulator photo library, opens
  Apple's out-of-process `PhotosPicker`, selects one photo, and verifies the
  React callback's index and count plus a nonempty copied temporary file with
  the seed's 120×80 dimensions. The high review identified the need to identify
  both rendered documents and the selected seed; these checks passed on the
  final simulator run. The generated coverage snapshot was refreshed with
  `vitest -u`. Screenshots and trace live in the local ignored
  `tests/native-features/build/web-photos-reviewed-proof` directory.
- **INFERRED, 2026-09-26:** `MultiDatePicker` needs a public representation of
  SwiftUI's selected date set, so that API choice stays on a named branch for
  Nate.
- **INFERRED, 2026-09-27, proposed on `one-native-multi-date-picker`:** represent
  the `Set<DateComponents>` as unique `YYYY-MM-DD` civil-day strings in the
  React `selection` array and sorted callback. This avoids treating a calendar
  day as a timestamp. The first native constructor is unbounded; a range can
  follow once the base control is proven. This is a new public API choice and
  must stay on the named branch for Nate's approval. Gregorian, Buddhist, and
  Republic of China iOS 27 runtime interactions passed; historical era
  boundaries and other calendar families remain unproven in SwiftUI.
- **RAN, 2026-09-26:** the `tab-slot` suite passed on iPhone 17 Pro iOS 27.
  `TabViewSlot` mounted a 50-point interactive bottom accessory above the
  system tab bar; its action reached React before and after switching tabs.
  `EmptyView` produced no accessibility element or visible content and kept a
  zero-height position between two 8-point React Native gaps. The fixture
  verifies the resulting 16-point separation; a composed SwiftUI `HStack`
  measured the same 12-point gap as a control row without `EmptyView`.
  It also verifies the accessory frame after a tab switch. The generated
  `TabViewSlotName` now excludes the boolean overload
  that requires an argument the component cannot supply. The coverage snapshot
  was refreshed with `vitest -u`; screenshots and trace are in the local
  ignored `tests/native-features/build/tab-slot-final-proof` directory.
- **RAN, 2026-09-26:** the `tab-sidebar` suite passed 14 checks on the generated
  iPhone-and-iPad test app built from the `tablet: true` fixture config,
  without patching its installed bundle. It ran on iPad Pro 13-inch (M5)
  iOS 27. The native sidebar mounted its
  header (44 points), footer (48 points), and bottom bar (52 points) in the
  expected order and sidebar area. Each slot's `Pressable` reached React. A
  tab selection closed the native sidebar; reopening it restored all three
  slots with their declared heights and working actions. The iPad aggregate runner
  runs this suite separately from the iPhone suites. The same suite passed six
  compact iPhone checks: the native tab bar switched tabs while all three
  sidebar slots remained absent. The existing eight-check `tab-slot` suite
  also passed on the generated universal app on iPhone 17 Pro. Screenshots
  and traces live in the local ignored `tests/native-features/build/`
  directories `tab-sidebar-reviewed-proof`, `tab-sidebar-compact-proof`, and
  `tab-slot-universal-smoke`.
- **RAN, 2026-09-26:** the existing `ArrangementView` fixture passed eight
  checks on a closed iPhone Duo running iOS 27.1. With the fixture's 0.5 split
  ratio, `automatic` and `split` yielded two stacked, equal-height panes;
  `overlay` gave both pane hosts the
  full arrangement frame, and switching back restored the stack. The proof
  checks the React style state as well as native accessibility frames. The
  27.1 runtime here supports only iPhone Duo, and Device Hub posture controls
  were unavailable to the headless driver, so open and folded posture behavior
  remains partial. The reviewed rerun asserts top alignment and half-height
  panes. Screenshots, trace, and a device/runtime/posture evidence manifest are
  in the ignored `tests/native-features/build/arrangement-reviewed-proof`
  directory.
- **RAN, 2026-09-26:** the `edit-button` suite passed on iPhone 17 Pro iOS 27.
  A SwiftUI `EditButton` composed as a native `List` row changed its own
  accessibility label from Edit to Done and back across two taps while the
  List rows remained mounted. This proves the native control label cycle;
  the List's edit state has no independent observable effect in this fixture.
  List row deletion and movement remain unavailable in the public API.
  Screenshots and trace are in the local ignored
  `tests/native-features/build/edit-button-final-proof` directory.
- **RAN, 2026-09-26:** the `view-slot` suite passed on iPhone 17 Pro iOS 27.
  `background` painted the requested fill and its base button reached React;
  `safeAreaInsetWithVerticalEdge` accepted `edge: 'bottom'`, placed the slot
  action below the base, and delivered its tap to React. The fixture does not
  establish that the action hugs the host's bottom edge. **INFERRED from
  source:** captured slot markers were outside the host's normal child
  activation traversal; the native host now propagates activation through
  them. The exploratory pre-fix run failed on a different base-button layout,
  so it is not a controlled before/after proof of that cause. Other ViewSlot names
  remain unproven. A native `Overlay.Content` button also reached React on the
  same rebuilt host, covering the shared Overlay marker path.
  Screenshots and trace are in the local ignored
  `tests/native-features/build/view-slot-reviewed-proof` directory.
- **RAN, 2026-09-27:** the same `view-slot` suite passed on iPhone 17 Pro
  iOS 27 with `mask` added. A native red Rectangle stayed visible at the
  center of a 120-point Circle mask, while all four corners matched the white
  screen behind it within 12 color levels. The existing background, overlay
  action, and safe-area inset action checks still passed. The fixture and
  screenshot/AX trace are in local ignored
  `tests/native-features/build/view-slot-mask-reviewed-proof-2`. High review
  s436 found that corner samples alone could pass for a noncircular mask and
  that out-of-bounds samples could pass vacuously. The reviewed 11-check rerun
  samples inside and outside each diagonal of the Circle, rejects every
  offscreen sample, derives positions from the measured frame, and allows the
  view to settle before capture. The coverage table now names `mask`; the
  remaining named ViewSlot modifiers are still unproven.
- **RAN, 2026-09-27:** the `view-slot` iPhone 17 Pro iOS 27 suite passed
  12 checks with an explicit SwiftUI frame on its Overlay base. With only an
  intrinsic `Text` base, `bottomTrailing` aligned the action at the glyphs,
  visually overlapping them despite the 260×100-point React Native host.
  Adding `swiftStyle.frameWithWidthAndHeightAndAlignment` to the base gave
  the native overlay a 260×100-point frame: the base text stayed centered,
  the action reached the bottom-right host edge, and the action tap still
  reached React. Screenshot and AX trace are in local ignored
  `tests/native-features/build/overlay-alignment-proof-4`. No native code
  change was needed; the conformance fixture and docs now state which frame
  SwiftUI aligns against.
- **RAN, 2026-09-26:** a dedicated `swipe-actions` suite passed 20 checks on
  iPhone 17 Pro iOS 27 after an arm64 simulator build. Before the fix, a
  trailing action appeared after a left swipe but tapping it left the React
  count at zero. Captured `SwipeActions.Actions` groups were outside the
  container's normal active-state traversal; the native host now propagates
  activation through both groups. The rebuilt app delivered trailing Archive
  and leading Pin taps to React, invoked Archive on the default full trailing
  swipe, and kept Pin uninvoked but tappable when the leading group set
  `allowsFullSwipe={false}`. The reviewed suite asserts that Pin closed before
  the full swipe, captures both full-swipe states, then remounts the row and
  confirms Archive still works. Screenshots and trace are in the local ignored
  `tests/native-features/build/swipe-actions-reviewed-proof` directory.
- **RAN, 2026-09-26:** the `disclosure-group` suite passed 15 checks on
  iPhone 17 Pro iOS 27 after an arm64 simulator build. Before the change, a
  standalone SwiftUI `DisclosureGroup` occupied zero React Native height;
  its visually rendered label was absent from accessibility and its expanded
  child overlapped the next row. After adding intrinsic measurement, a native
  tap grew the standalone frame from 28.3 to 48.7 points and shifted the next
  row by 20.3 points. A second tap collapsed it, and two external React
  revision changes expanded and collapsed it. Inside `One.iOS.Host`, the group
  grew its parent from 28.3 to 48.7 points with the following row below it,
  then shrank on a second tap. High review s422 found an explicit-height risk;
  the native view now disables intrinsic measurement when React Native proposes
  a height. The reviewed fixture kept an 80-point group and its following row
  fixed while expanding its content. A group inside `ZStack` and another inside
  `ViewThatFits` each grew its parent from 28.3 to 48.7 points, and native taps
  updated React state. The suite checks native accessibility and frames;
  screenshots and trace are in local ignored
  `tests/native-features/build/disclosure-reviewed-proof-2`.
- **RAN, 2026-09-27:** after DisclosureGroup measurement unblocked the broad
  `groups` suite, its ControlGroup displayed Add and Star outside a zero-height
  React Native box. Their accessibility elements were missing and the native
  segment overlapped the next row. ControlGroup now measures its standalone
  SwiftUI height while honoring an explicit React Native height. The dedicated
  iPhone 17 Pro iOS 27 suite passed nine checks: a 31-point standalone frame
  with the next row 12 points below, both native buttons reaching React, a
  measured Host composition, and a fixed 80-point group whose following row
  did not move after a tap. The broad `groups` suite then passed 34 checks.
  It records the observed removal of a row after its destructive swipe action
  and remounts before checking the leading action; the icon-only Button check
  asserts its native accessible frame and React action, since iOS 27 exposes
  no separate nested image frame for geometric centering. Screenshots, AX
  trees, and outcomes are in local ignored `tests/native-features/build/`
  directories `control-group-proof-2` and `groups-after-control-3`. High review
  s428 found that the focused mount wait could race SwiftUI's asynchronous
  height callback; the reviewed wait now requires all three group heights and
  following-row gaps before asserting them. The rerun passed all nine checks
  in `control-group-reviewed-proof-4`. **RAN:** toggling a subtitle and then a
  two-line custom label under the automatic ControlGroup style left its native
  height at 31 points. Dynamic native-height changes remain unproven for this
  style. The broad suite checks the icon-only button's frame and action, while
  its screenshot remains the evidence for visual centering.
