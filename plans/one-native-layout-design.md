# design proposal: native layout and composition

status: reviewed once (r26161, held), stage 1 probe run, stage 2 contract revised
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
even with `sizingOptions = [.intrinsicContentSize]` set. So a composition host must
schedule its own remeasure whenever a child publishes, updates, or unpublishes a
model, and whenever anything else changes content without changing host bounds.
Nothing in UIKit or SwiftUI will do it.

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
2. The composition contract in the emitter: an `internal` published model type per
   control, activation on publication rather than on window membership, the
   height-only shadow node write, and a host that schedules its own remeasure on every
   publication change. Carries only already-generated leaf controls, so the mounting
   and measurement work stays separate from catalog growth.
3. `Host` plus `VStack`/`HStack` using that contract, with intrinsic height.
4. `Text`, `Label`, `Form`, `Section` as generated catalog entries that are containers
   or leaves within a host. `Form` takes an explicit height; it has no intrinsic one.
5. Explicit RN slot inside a host, reusing `OneNativeSlot` in `fill` mode.
6. Popover.

Stage 2 is the boundary, and it is an emitter change rather than the mechanical mode
split the first draft assumed. Its runtime suite has to assert that a composed control
still emits events, since that is the failure the review found by reading and the one
a rendering screenshot would miss.

## What this does not cover

Scroll views, lists, and grids. They need cell reuse and a measurement contract per
row, which is a larger boundary than this one and deserves its own proposal after a
host exists. Android rendering and browser rendering stay in
`plans/one-native-architecture.md`. The `schema.json` gaps named in the README
(accessibility mapping, an executable definition of slot `layout` values, and any
imperative ref/command/measurement contract) become more pressing once containers
exist, because a Soot implementation of a container needs the measurement contract
this proposal defines.
