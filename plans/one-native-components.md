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

Bound but never exercised by a suite (`tests/native-features/COVERAGE.md`):
`ContextMenu`, `FullScreenCover`, `ShareLink`, `ContentUnavailableView`,
`PhotosPicker`, `WebView`, `ZStack`, `Spacer`, `LabeledContent`, `Glass`,
`EditButton`, `EmptyView`, `TabViewSlot`. A suite per family closes these.

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
| bound views without a suite | `ContextMenu`, `FullScreenCover`, `ShareLink`, `ContentUnavailableView`, `PhotosPicker`, `WebView`, `ZStack`, `Spacer`, `LabeledContent`, `Glass`, `EditButton`, `EmptyView`, and `TabViewSlot` | family suites after new views |

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
on the iPhone 17 Pro iOS 27 simulator with the output quoted in the commit.
One high review per assembled batch (`tm run --group lg` while the Claude
accounts are unavailable).

## Status

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
  exact final binary includes an encode-failure guard added after the passing
  simulator run and still needs a simulator rerun.
- **RAN, 2026-09-26:** `GroupBox` landed on `v2-beta` at `3870f568d` after
  `generate:check`, 39 JS tests, a successful arm64 build, and all seven
  `group-box` checks on an iPhone 17 Pro iOS 27 simulator. The suite covers
  labeled and unlabeled boxes, measured child bounds, a native child button,
  and a React-driven label update.
- **INFERRED, 2026-09-26:** `MultiDatePicker` needs a public representation of
  SwiftUI's selected date set, so that API choice stays on a named branch for
  Nate. `ConcentricRectangle` is assembled on a named WIP branch; its native
  simulator proof is the next gate before merging to `v2-beta`.
