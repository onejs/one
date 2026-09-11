# What One Native is missing from SwiftUI

Measured against the SDK the generator already parses: 25 modules (SwiftUI, SwiftUICore and all
23 `_<Framework>_SwiftUI` overlays), 11,212 declarations. That number is an extraction statistic
and is not a denominator for anything below; the counts here are of named API, which is what you
would actually have to bind.

Bound today: 29 Fabric components, and roughly 29 view modifiers applied inside them.

## The shape of the hole

One Native binds **leaf controls**. Each control is one Fabric component: scalar props in, numbered
events out, SwiftUI state owned natively and reconciled against JS through the controlled protocol.
`Host`, `Form`, `Section` and `ContainerSlot` extend that to composition, so a SwiftUI subtree can
contain a React Native subtree and back again.

Everything missing falls out of one fact: **a SwiftUI view is only reachable if it can be the whole
content of a Fabric component.** Anything that is a *property of the tree* rather than a node in it
has no way in. That is most of SwiftUI.

Concretely, there is no way today to say anything about how a control looks or behaves beyond the
props its catalog entry declares. Grep the catalogs for `font`, `tint`, `foregroundStyle`,
`padding`, `frame`, `background`: none of them exist. Every control renders at system defaults.

## Tier 1: the four gaps that block real apps

### 1. No styling surface at all

Of the 385 public iOS view modifiers in SwiftUI/SwiftUICore, these families are entirely unbound:

| family | modifiers | bound |
|---|---|---|
| decoration and effects (`background`, `overlay`, `border`, `clipShape`, `shadow`, `opacity`, `blur`, `mask`, `glassEffect`, `symbolEffect`, `redacted`, ...) | 54 | 0 |
| box and layout (`frame`, `padding`, `offset`, `position`, `fixedSize`, `aspectRatio`, `layoutPriority`, `safeAreaInset`, `alignmentGuide`, `containerRelativeFrame`, ...) | 28 | 0 |
| text appearance (`font`, `fontWeight`, `bold`, `italic`, `lineLimit`, `lineSpacing`, `multilineTextAlignment`, `minimumScaleFactor`, `truncationMode`, `kerning`, ...) | 33 | 0 |
| color (`foregroundStyle`, `tint`, `backgroundStyle`, `preferredColorScheme`, `listItemTint`) | 7 | 0 |

`style` on a control reaches the Fabric `UIView` behind the SwiftUI content, not the content, so
`style={{ backgroundColor }}` paints behind a Toggle rather than tinting it. There is no
`accentColor`/`tint`, so a whole app of One Native controls is stuck on system blue.

This is the single biggest gap and it is also the cheapest to close, because the mechanism exists:
a `swiftStyle` object prop carried as an `objects` payload and applied by one generated
`.oneNativeStyle(model.style)` helper on every control, with each field selected from the SDK for
provenance the same way `methods` entries already are.

### 2. SwiftUI's layout system is unreachable

Yoga owns layout. `Host` gives you a vertical or horizontal stack with `spacing` and three
alignments; that is the entire layout vocabulary. Missing: `ZStack`, `LazyVStack`, `LazyHStack`,
`LazyVGrid`, `LazyHGrid`, `Grid`/`GridRow`, `ViewThatFits`, `GeometryReader`, `Spacer`, `Divider`,
`GroupBox`, `DisclosureGroup`, `ControlGroup`, `ContentUnavailableView`, and the `Layout` protocol
for custom layouts.

Most of these are the right call to skip, because React Native already lays out. The ones that are
not substitutable are the ones whose behavior is not expressible in Yoga: `ViewThatFits`,
`GeometryReader`, `alignmentGuide`, `Grid` with spanning cells, and `safeAreaInset`.

### 3. No scroll, no list

`ScrollView`, `ScrollViewReader`, `List`, `ForEach`, `OutlineGroup`, `Table`, `TableColumn` are all
unbound, along with 15 scroll modifiers (`scrollPosition`, `scrollTargetBehavior`,
`scrollDismissesKeyboard`, `scrollIndicators`, `scrollTransition`, `refreshable`, ...) and 19
list-row modifiers (`listStyle`, `listRowBackground`, `listRowSeparator`, `swipeActions`,
`deleteDisabled`, `moveDisabled`, ...).

`Form` and `Section` are bound, so the grouped-inset look is reachable, but a `Form` containing a
long list still scrolls as a SwiftUI scroll view whose position JS cannot read or set, and there is
no swipe-to-delete anywhere. Practically: React Native's `FlatList` stays the answer for lists, and
what is worth stealing from SwiftUI here is `swipeActions` and `refreshable` on rows, which
`ContainerSlot` could carry.

### 4. No navigation

`NavigationStack`, `NavigationLink`, `NavigationSplitView`, `navigationDestination`,
`navigationTitle`, `navigationSubtitle`, `toolbar` and its 10 companions, `ToolbarItem`,
`ToolbarItemGroup`, `searchable` and its 7 companions: none bound, 22 navigation modifiers and 8
search modifiers at zero.

`Tabs` is bound, so the tab bar is native. The nav bar is not. This is the gap most visible to a
user, because it is what makes an app feel like it was built by Apple, and it is also the hardest,
since it collides head-on with whatever router the app already uses.

## Tier 2: the utility machinery you asked about

This is the half that is not views, and it is where the mechanism runs out rather than where work
simply has not been done.

**State and observation.** 29 property wrappers: `State`, `Binding`, `Bindable`, `StateObject`,
`ObservedObject`, `EnvironmentObject`, `Environment`, `FocusState`, `AccessibilityFocusState`,
`GestureState`, `Namespace`, `ScaledMetric`, `AppStorage`, `SceneStorage`, `FocusedValue`,
`FocusedBinding`, `FetchRequest`, `Query`, `UIApplicationDelegateAdaptor`. None are exposed and most
should never be: JS is the source of truth, and the controlled protocol (optimistic native value,
numbered events, acknowledgement and reset revisions) is deliberately the one place two-way state
lives. The three that do matter and are absent are `FocusState` (see below), `Namespace` (needed for
`matchedGeometryEffect`), and `ScaledMetric` (Dynamic Type scaling of a caller-supplied number).

**Environment.** 148 `EnvironmentValues` keys, none readable or writable from JS. The consequences
that bite: no `colorScheme` or `preferredColorScheme`, so a One Native control cannot be told the
app is in dark mode independently of the system; no `dynamicTypeSize`, `locale`, `calendar` or
`timeZone` override, so a `DatePicker` always uses the device locale; no `isEnabled` propagation, so
`disabled` has to be set per control rather than on a container; and no access to the action values
`dismiss`, `openURL`, `refresh`, `requestReview`, `openSettings`.

**Focus.** All 11 focus modifiers unbound, and `keyboardType` with them. There is no way to focus a
`TextField` programmatically, no next-field chain, no way to know what is focused, and no way to ask
for a numeric keyboard. For a form library this is a functional blocker, not a polish item. The
catalog comment in `textCatalog.ts` already calls this out.

**Animation and transitions.** All 12 unbound: `animation`, `transition`, `transaction`,
`contentTransition`, `matchedGeometryEffect`, `matchedTransitionSource`, `navigationTransition`,
`phaseAnimator`, `keyframeAnimator`, `scrollTransition`, `sensoryFeedback`, `springLoadingBehavior`.
Also unbound: `withAnimation`, the whole `Animation` type (46 declarations of curves and springs),
`CustomAnimation`, `Animatable`, `VectorArithmetic`, the 8 concrete `Transition` types
(`AsymmetricTransition`, `MoveTransition`, `OpacityTransition`, `PushTransition`, `ScaleTransition`,
`SlideTransition`, `OffsetTransition`, `IdentityTransition`), `PhaseAnimator` and `KeyframeAnimator`.

Nothing here is reachable through props as they stand, because an animation is a property of a
*change*, not of a value. Making `withAnimation` work would mean the native side recognising that a
prop changed inside an animated transaction, which is a real protocol addition. `sensoryFeedback`
(haptics on a value change) is the exception: it is a plain prop and would work today.

**Gestures.** All 23 gesture and input modifiers unbound, plus the 12 gesture types (`DragGesture`,
`TapGesture`, `SpatialTapGesture`, `LongPressGesture`, `MagnifyGesture`, `RotateGesture`,
`SpatialEventGesture`), `GestureState`, and the drag-and-drop family (`draggable`, `dropDestination`,
`onDrag`, `onDrop`, `dragConfiguration`). React Native has its own gesture system and its own
responder chain, and the two do not compose, so this is the area where "bind it" is most likely to be
the wrong answer. The exception is drag and drop between apps, which RN has no answer for.

**Preferences and anchors.** `preference`, `anchorPreference`, `transformPreference`,
`transformAnchorPreference`, `onPreferenceChange`, `backgroundPreferenceValue`,
`overlayPreferenceValue`, and the `PreferenceKey`/`LayoutValueKey`/`ContainerValueKey` protocols.
This is SwiftUI's child-to-parent channel. It is entirely internal to a SwiftUI tree, so it only
matters once a One Native tree is deep enough to need it, which today it is not.

**Lifecycle and data flow.** `onAppear`, `onDisappear`, `onChange`, `task`, `onReceive`, `onOpenURL`,
`onContinueUserActivity`, `userActivity`: all unbound. React has equivalents for the first four, so
the ones that are genuinely missing are `onOpenURL` and the user-activity pair (Handoff, Spotlight,
Siri shortcuts).

**Extension protocols.** 131 protocols, of which the ones a caller would want to implement are
`ViewModifier`, `Layout`, `Shape`, `InsettableShape`, `ShapeStyle`, `Transition`, `CustomAnimation`,
`TextRenderer`, `VisualEffect`, `GeometryEffect`, `ScrollTargetBehavior`, `PreferenceKey`,
`EnvironmentKey`, and the 24 style protocols. Style protocols are bound only as fixed enum cases, so
you can pick `.bordered` from the 11 shipped `PrimitiveButtonStyle`s but you cannot write a style.
That is the right trade for now; a caller-written Swift style would defeat the point of generating
from the SDK.

**Drawing primitives.** `Image`, `Color`, `Canvas`, `Shape` and its concretes (`Rectangle`, `Circle`,
`Capsule`, `RoundedRectangle`, `UnevenRoundedRectangle`, `ConcentricRectangle`, `Ellipse`, `Path`),
`AngularGradient`, `LinearGradient`, `RadialGradient`, `EllipticalGradient`, `MeshGradient`,
`Material`, `AsyncImage`, `TimelineView`. SF Symbols are reachable only through `Label` and the
`systemImage` prop on `Button`; there is no standalone `Image`, so no symbol effects, no variable
symbol values, no rendering modes. `MeshGradient` and `Material` are the two with no RN equivalent.

## Tier 3: views that are unbound and worth binding

Ordered by how often a real app wants them.

1. **`Image` (SF Symbols)** plus `symbolRenderingMode`, `symbolVariant`, `symbolEffect`,
   `imageScale`, `foregroundStyle`. Small, self-contained, and the thing every screen needs.
2. **`PhotosPicker`** (`_PhotosUI_SwiftUI`, iOS 16). Already flagged as reachable with no new
   mechanism; needs async item loading to hand JS a file path.
3. **`ShareLink`** and `ActivityView`. One prop, one native sheet, no RN equivalent that looks right.
4. **`TextEditor`** plus `textEditorStyle`. Multi-line input at system quality.
5. **`fullScreenCover`**. The `presentation` layout kind already exists; this is a near clone of
   `Sheet`.
6. **`contextMenu`**. `Menu` is already bound, so the menu content emitter is reusable.
7. **`ContentUnavailableView`**. Empty states, one line, exactly matches the system look.
8. **`DisclosureGroup`** and **`GroupBox`**. Both are container-shaped, so `ContainerSlot` carries them.
9. **`SignInWithAppleButton`** (`_AuthenticationServices_SwiftUI`) and **`LocationButton`**
   (`_CoreLocationUI_SwiftUI`). Both are single-purpose buttons Apple requires you to use verbatim.
10. **`PayWithApplePayButton`** / **`AddPassToWalletButton`** (`_PassKit_SwiftUI`). Same argument.
11. **`WebView`** (`_WebKit_SwiftUI`). Blocked on an availability gate: it is iOS 26 and the package
    declares `minimumVersion: 18`, so this needs a control-level `@available` mechanism that does not
    exist yet. That is a design decision, not an implementation detail.
12. **`Model3D`** / **`RealityView`** (`_RealityKit_SwiftUI`), **`SceneView`**, **`SpriteView`**,
    **`ArtworkImage`**, **`Query`**. Real API, narrow audience.

Unbound and deliberately skipped: everything macOS-only (`Settings`, `Window`, `WindowGroup`,
`MenuBarExtra`, `HSplitView`, `VSplitView`, `UtilityWindow`, `DocumentGroup`, the 16 file-dialog
modifiers), the 31 StoreKit merchandising modifiers, the preview family (`previewDevice`,
`previewLayout`, `PreviewProvider`), the widget family (`Widget`, `ControlWidget`, `WidgetBundle`),
and the internal `_`-prefixed API (29 modifier names).

## What I would do next, ranked

1. **A styling surface.** One `swiftStyle` payload prop, applied by a single generated helper, with
   every field selected from the SDK. Start with `font`/`fontWeight`, `foregroundStyle`, `tint`,
   `padding`, `frame`, `background`, `cornerRadius`, `opacity`, `lineLimit`,
   `multilineTextAlignment`. This unblocks every control at once and is the only item here that
   changes what existing bindings can do rather than adding new ones.
2. **`Image` with SF Symbol effects.** Small, and it is the most-wanted missing view.
3. **Focus and `keyboardType`.** `FocusState` driven by a `focused` prop plus an `onFocusChange`
   event, using the same controlled protocol the value props already use. Without it the form
   controls are not finished.
4. **Environment propagation.** At minimum `colorScheme`, `dynamicTypeSize`, `locale`, `tint` and
   `isEnabled` settable on `Host`/`Form` and inherited by descendants, so a screen is configured once
   instead of per control.
5. **`PhotosPicker`, `ShareLink`, `fullScreenCover`, `contextMenu`, `ContentUnavailableView`.** All
   reachable with the mechanisms that exist.
6. **Decide the navigation question.** Binding `NavigationStack` means owning the interaction with
   the app's router. Worth a design pass before any code.
7. **Leave gestures and animation alone** until something concrete needs them. Both would need real
   protocol additions, and RN already has answers that work.
