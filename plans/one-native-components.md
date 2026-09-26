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
One Opus high review per assembled batch.

## Status

- **RAN, 2026-09-26:** slice 1 `TextEditor` and `UnevenRoundedRectangle` passed
  `generate:check`, all seven shape tests, and the `editors` conformance suite
  on the iPhone 17 Pro iOS 27.0 simulator. The suite checked native multiline
  input, React acceptance and rejection, external updates, revision reset,
  frame size, and both corner arrangements with screenshot pixels. Screenshots
  and the machine-readable trace live in the local `tests/native-features/build/editors-proof`
  artifact directory; that directory is not a committed source artifact.
