# design proposal: native layout and composition

status: all six stages landed
branch: `feat/one-native`
scope: SwiftUI tree composition, intrinsic measurement, explicit RN slots, Popover

Everything One Native generates today is a leaf. A control owns one
`UIHostingController`, renders one SwiftUI view, and the React adapter supplies a
default height because Yoga has no idea what SwiftUI would have measured. That is
enough for Picker through ConfirmationDialog and it is not enough for anything with
structure: a Form with Sections, a VStack of controls, a Label beside a Toggle, or a
Popover whose trigger is inline content and whose body is presented elsewhere.

This proposal covers the next boundary. It is the last piece where being wrong is
expensive, so it gets one review before any code.

## What has to become true

1. A React tree can describe a SwiftUI tree: `Host > Form > Section > Toggle`.
2. One SwiftUI tree renders in one hosting controller, not one per node.
3. SwiftUI's measured size reaches Yoga, so `height: 44` guesses disappear.
4. A React Native subtree can appear at an arbitrary point inside that SwiftUI tree.
5. The thirteen generated controls work unchanged both standalone and composed.

Point 5 is the constraint that rules out most designs. The generated per-control
Fabric specs, ObjC++ adapters, validation, and controlled protocol are the asset
here. A composition mechanism that requires re-describing every control in a second
vocabulary doubles the catalog and guarantees the two descriptions drift.

## Two mechanisms already in the codebase

Both candidate designs are generalizations of something that already works, which is
why the choice is narrower than it looks.

**Data props, flattened.** `Swift.Menu` sends its whole tree as one
`ReadonlyArray<NativeMenuItem>` with `parentId` links, because React Native codegen
cannot express a recursively nested object array. `OneNativeGeneratedMenuContent`
rebuilds the tree natively. No Fabric view exists per menu item.

**Fabric children, re-parented.** `Swift.Tabs` gives each page a real Fabric child
(`OneNativeTab`), and `OneNativeSlot` re-parents that child's UIView into SwiftUI,
with SwiftUI allocating bounds and reporting them back to Fabric state for Yoga
(`OneNativeSlotShadowNode.h`). Sheets do the same in `presented` mode with a local
origin and their own touch handler.

## Option A: extend the flattened data-prop tree

One `OneNativeHost` component takes a flattened node array covering stacks,
text, labels, forms, sections, and every leaf control, plus indices naming which
children are React Native slots.

Good: one Fabric view for a whole screen of native UI, no per-node mounting cost, no
recycling surface, and the menu already proves the shape works.

Bad: it re-describes all thirteen controls as members of one node union. Every
control prop must be expressible in a single flat record, which is exactly the
constraint that forced `parentId` flattening on menus. Enum validation, the
controlled protocol, per-control events, and the generated specs would all need a
parallel implementation inside the host. Two sources of truth for Toggle.

## Option B: composed Fabric children with one hosting controller

Recommended.

A control gets a second rendering mode. Standalone is what exists now: the component
view creates its own `OneNativeHostingController` and attaches it. Composed means the
component view creates no controller at all and instead publishes its existing
`<Name>Model` to whichever One Native container mounted it.

A container (`Host`, `VStack`, `HStack`, `Form`, `Section`, `Popover`) is a Fabric
view that overrides `mountChildComponentView:index:` and
`unmountChildComponentView:index:`. Fabric already delivers children in order with an
index, so the container keeps an ordered list of child models and never adds the
child views as subviews.

Good: the generated catalog stays the single source of truth. A composed Toggle keeps
its own props, its own events, its own enum validation, and its own controlled state,
because it is still its own Fabric component. Nesting is real Fabric nesting, so React
reconciliation, keys, and conditional rendering all behave normally. An explicit RN
slot is just another child kind, reusing `OneNativeSlot` in `fill` mode.

Bad: one Fabric component view per node, and every generated control needs the mode
split.

### What the review changed

The assigned review (r26161, codex xhigh) held the recommendation and rejected the
claim that the thirteen controls work composed "unchanged". Two of its findings are
confirmed by reading `ios/Generated/OneNativeToggleView.swift`:

- `ToggleModel` and `ToggleContent` are `private` at file scope, so no separate
  container file can render `ToggleContent(model:)`. The emitter has to publish a
  composition type, not reuse the private structs.
- `updateHost()` sets `model.active = controller?.parent != nil` behind
  `guard window != nil`, and `change(_:)` starts with `guard active`. A child that is
  never added as a subview never gets a window, so its `active` stays false and it
  emits no events, forever. Composed mode has to activate on publication instead of
  on window membership.

The review also named the Fabric contract: `RCTComponentViewProtocol` says mounting
adds the child as a subview and unmounting removes it. Nothing enforces it (the
mounting manager calls the overrides without asserting, and recycling only requires
`superview == nil`), and `OneNativeTab` is not a precedent for skipping it, because
`OneNativeTabsView` does re-parent each page UIView into an `OneNativeSlot`. So a
composed child's inherited `ViewProps` land on a UIView nobody displays: testID,
accessibility, pointer, and visual props applied by `RCTViewComponentView` are lost,
and `accessibilityOrder` walks UIKit subviews it cannot find. Composed mode must
either map the props it supports into SwiftUI or reject the ones it does not, and
that decision belongs in the catalog rather than in each container.

Two mechanics the review supplied that stage 2 follows directly. Do not reach for a
custom `YGMeasureFunc`: RN routes measurement through `measureContent`, a measurable
node must also be a `LeafYogaNode`, and that function cannot call
`UIHostingController.sizeThatFits` because it is not on the main thread. The state
write plus `adopt` feedback path is the supported seam. And a composed child preserves
`_props` through recycling, resetting only its parent reference, active flag,
publication, and event bindings, while unmount removes it from the parent's list
without resetting its model, because Fabric can remove and re-insert the same view
without sending it through the recycle pool.

Cost worth naming: a composed child's UIView is created and recycled by React Native
even though nothing ever displays it.

## The measurement loop, which stage 1 settled

Intrinsic sizing was the part that could go wrong quietly, so it was probed before
any emitter work. A temporary `OneNativeMeasureProbe` Fabric component hosted a
SwiftUI `Form`, `VStack`, and wrapping `Text` in a `UIHostingController`, measured
each at the width Yoga proposed, wrote the height into Fabric state, and counted
every measure, layout, and state write. A `CADisplayLink` counted frames between a
state write and the layout that consumed it. The probe ran on iPhone 16, iOS 26.4,
RN 0.86.2, and has been removed.

RAN, on the probe:

**Write the height, never the size.** The first version pinned both axes through
`YogaLayoutableShadowNode::setSize`, the way `OneNativeSlotShadowNode` does. A
container that does this stops responding to its parent: changing the React Native
`width` from 340 to 200 left the probe laid out at 340, because state had pinned the
width. The fix is a shadow node method that writes only `yoga::Dimension::Height`,
leaving the width to Yoga. With that, a 340 to 200 width change re-proposed 200 and
the wrapping `Text` grew from 167 to 323 points, exactly the two-line result.

**`sizeThatFits(in:)` is the mechanism. `intrinsicContentSize` is not.** With
`sizingOptions = [.intrinsicContentSize]` the controller reported 597.67 by 89 for
text that `sizeThatFits` measured as 316.33 by 167 at a 340-point proposal. The
intrinsic size ignores the proposed width, so it answers a different question.

**A container must not adopt the measured width.** `sizeThatFits` returns SwiftUI's
ideal width, which is smaller than the proposal: 316.33 against 340, 198.67 against
200. Only the height it returns is usable.

**A `Form` has no intrinsic height.** Proposed `.greatestFiniteMagnitude` it returns
0; proposed 10,000 it returns 10,000. It is greedy in height at every row count and
every width. `VStack` and `Text` return the same height under both proposals, so the
divergence identifies greedy content rather than a measurement bug. Intrinsic sizing
therefore cannot be offered for `Form`: `Form` gets an explicit height, and the
container API has to say so rather than silently measuring zero.

**A state write from `layoutSubviews` costs no frame.** `framesToLayout` was 0 on
every write, across row changes, mode changes, and width changes. Yoga consumed the
write and laid the view out within the same display frame.

**The loop terminates.** Each change cost about two layouts and three measures, and
with the view idle for five seconds the counters stayed frozen at 38 measures, 15
layouts, 7 writes. The half-point dedupe is enough.

**A measurement taken in the same turn as the model write is stale.** Measuring from
`updateProps`, immediately after publishing to the SwiftUI model, always returned the
previous content's height: 100 when the truth was 323, 323 when the truth was 167.
Measure from `layoutSubviews`, never from `updateProps`.

**Nothing schedules a remeasure on its own.** This is the answer to the question the
reviewer added, and it came from a negative control: the probe was rebuilt with every
explicit `setNeedsLayout` and async remeasure removed, leaving `layoutSubviews` as
the only path. `layoutSubviews` then ran exactly once, at mount. A mode change, two
row changes, and three idle seconds produced no second layout, no second measure, and
no report. SwiftUI re-rendered its content and the Fabric host never heard about it,
even with `sizingOptions = [.intrinsicContentSize]` set. So a host that measures from
UIKit must schedule its own remeasure on every content change. Stage 3 avoided the
problem instead, by measuring from SwiftUI.

**An empty container measures 0.** Before any child exists, `sizeThatFits` returns
zero height, so a container that mounts before its children occupies no space and
then grows. Since the grow costs no frame, this is a first-frame flash rather than a
lasting error, but a container whose children arrive in a later transaction than the
container itself will visibly jump.

## Popover

Popover is why this wave is bundled. Unlike Alert and ConfirmationDialog it needs two
things at once: inline trigger content that participates in layout, and presented
content that leaves the RN surface. The presented half is exactly the sheet's
`presented` slot mode. The trigger half is the composition mechanism above.

Building Popover before the container design is settled would mean inventing a
one-off trigger mechanism and then replacing it, which is why it was deferred out of
the dialog wave rather than shipped with a hand-written host.

The ConfirmationDialog runtime finding is directly relevant: iOS 26 already adapts a
confirmation dialog into a popover anchored at the host's own React Native position.
Anchoring therefore works off the host view's frame, which a zero-size host gives as
a point. A Popover with real trigger content gets a real anchor rect for free.

## Staging

Each stage compiles, regenerates, and has a runtime suite before the next starts.

1. Done. Runtime probe, results above, no catalog change, probe removed.
2. Done. The composition contract: `OneNativeComposable` in
   `ios/OneNativeComposition.swift`, every generated control conforming through
   `compositionContent()`, activation on publication rather than on window membership,
   and the standalone fill frame moved out of the generated content so a composed
   control takes its ideal size.
3. Done. `Swift.Host` with `axis`, `spacing` and cross-axis `alignment`, carrying the
   thirteen already-generated controls, with the height-only shadow node write. The
   `host` conformance suite covers it.
4. Done. `Text` and `Label` as generated leaf controls, and `Swift.Form` and
   `Swift.Section` as containers built on one shared `OneNativeContainerView`, so
   containers nest. The `containers` conformance suite covers it.
5. Done. `Swift.Slot` carries a React Native subtree into a container, reusing
   `OneNativeSlot` and the shared slot shadow node. SwiftUI proposes the box from an
   explicit `height`, so the subtree lays out inside it.
6. Done. `Swift.Popover` is a measured container whose children are the trigger and
   whose `content` is a presented React Native subtree, so it is the composition
   contract and the sheet's presented slot put together.

### What stages 2 and 3 changed against the plan

Measurement moved from UIKit to SwiftUI. The proposal, and stage 1, assumed the host
would call `sizeThatFits(in:)` from `layoutSubviews` and write Fabric state. That works
and the numbers are right, but nothing schedules the remeasure, so mounting two more
children left the host at its old height while the content overflowed it. The fix is
`onGeometryChange` on the host's content under `fixedSize(horizontal: false, vertical:
true)`, so SwiftUI reports its own ideal height on its own update pass. Every case that
needed explicit scheduling then works without any: a later child mount, a child prop
change that leaves the host's bounds alone, spacing, and axis.

The reviewer was right that the generated `private` content structs are unreachable
from a separate host file, and wrong that this forces the emitter to publish a model
type. Each control returns its own `AnyView` from `compositionContent()`, inside its
own file where `private` is not a barrier, so the host never names a control's types.

The standalone `.frame(maxWidth: .infinity, maxHeight: .infinity)` had to leave the
generated content struct for a wrapper the standalone hosting controller applies.
Composed, that frame makes a control take whatever the stack offers rather than its
ideal size.

Horizontal hosts hold whatever fits. Three width-greedy SwiftUI controls side by side
on a phone overflow, and SwiftUI then reports a much taller ideal height (128 points
for 50 points of content, 362 with 20-point spacing). One child measures exactly. That
is SwiftUI's layout for content that does not fit, confirmed by measuring the same host
with one child, so the suite asserts horizontal by child order rather than by height.

### What stage 4 changed against the plan

Containers turned out to be one thing, not three. `OneNativeContainerView` owns the
children array, the publication into SwiftUI, the composition state, and the standalone
hosting controller; a host, a form and a section differ only in the SwiftUI container
they wrap the published children in, which each supplies at init. A container is
composable itself, which is what makes `Form > Section > Toggle` and a host inside a
section work without any container knowing what its parent is.

A `Form` gets its height from React Native rather than from a prop. The plan said
`Form` takes an explicit height, and it does, but through the ordinary `style` that
every Fabric view already has: the adapter defaults it to `flex: 1` and the caller
overrides with a height. A second height API next to `style` would have been a second
way to say the same thing.

A `Form` composed into a `Swift.Host` renders nothing, and that is now rejected in
JavaScript. RAN: wrapping the containers fixture's form in a host reported `Form: 0`
and the form and both its sections vanished from the accessibility tree. It follows
from stage 1's finding that a `Form` has no ideal height, since a measured host asks
for exactly that, but the failure is silent, so `Swift.Host` throws when a direct child
is a `Swift.Form`. A host inside a form or a section is fine and is covered by the
suite.

### What stage 5 changed against the plan

The slot reports a LOCAL origin, the way presented sheet content does, rather than its
frame in a layout host's coordinate space the way a tab page does. A composed container
has no view in the window to convert against, so there is nothing to measure relative
to. RAN: with the origin reported either way, a slot renders and takes taps identically,
so on iOS the origin is not what routes the touch.

A slot fills the width its container offers, and an `HStack` offers none, so a slot in a
horizontal host takes an explicit `width` too. RAN: without one, the slot's box collapsed
to the text's own width while the React Native content still drew, which looks correct
and is not tappable.

React Native recycles a slot's view in the same mounting transaction that unmounts it,
and asserts the view has no superview. SwiftUI dismantles a representable later than
that, so the slot removes its view from the SwiftUI tree in `decompose()`. RAN: without
it, unmounting a section that held a slot aborted in
`RCTComponentViewRegistry _enqueueComponentViewWithComponentHandle:`.

## What this does not cover

Scroll views, lists, and grids. They need cell reuse and a measurement contract per
row, which is a larger boundary than this one and deserves its own proposal after a
host exists. Android rendering and browser rendering stay in
`plans/one-native-architecture.md`. The `schema.json` gaps named in the README
(accessibility mapping, an executable definition of slot `layout` values, and any
imperative ref/command/measurement contract) become more pressing once containers
exist, because a Soot implementation of a container needs the measurement contract
this proposal defines.

### What stage 6 changed against the plan

Nothing structural, which is what the plan was for. Popover needed no mechanism of its
own: the trigger is `OneNativeContainerView` composition and the body is the sheet's
presented slot, reusing `OneNativeSlot` and the shared slot shadow node. The measured
height that `Swift.Host` reports is now a template, `OneNativeMeasuredShadowNode`, with
an `OneNativeMeasuredComponentView` base on the Objective-C side, so the host and the
popover trigger share one measurement contract rather than two copies of it.

Three things the runtime settled (RAN in the new `popover` suite):

- SwiftUI sizes a popover from its content, and a React Native subtree has no ideal
  size, so `contentWidth` and `contentHeight` are required, the same bargain a slot
  makes with `height`.
- The anchor is the trigger's own bounds, so the trigger stack hugs its content and an
  outer `frame(maxWidth: .infinity, alignment: .leading)` is what puts it at the leading
  edge. Written the other way round the popover anchors to the full row and the arrow
  points at the middle of the screen.
- The dialog wave's finding held: anchoring works off the trigger's React Native
  position, and the arrow points at the button. On an iPhone the default compact
  adaptation presents the body as a full-height sheet, so the fixture covers both that
  and `presentationCompactAdaptation: 'popover'`.
