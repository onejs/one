# design proposal: native layout and composition

status: proposed, awaiting one assigned review before implementation
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
child views as subviews. The container's SwiftUI body switches over that list and
renders `ToggleContent(model:)`, `ButtonContent(model:)`, and so on, which are the
same private content structs the emitter already produces.

Good: the generated catalog stays the single source of truth. A composed Toggle keeps
its own props, its own events, its own enum validation, and its own controlled state,
because it is still its own Fabric component. Nesting is real Fabric nesting, so React
reconciliation, keys, and conditional rendering all behave normally. An explicit RN
slot is just another child kind, reusing `OneNativeSlot` in `fill` mode.

Bad: one Fabric component view per node, and every generated control needs the mode
split. The emitter change is real but mechanical and lands in one place.

Cost worth naming: a composed child's UIView is created and recycled by React Native
even though nothing ever displays it. That is the same trade `OneNativeTab` already
makes.

## The measurement loop, which is the actual risk

Intrinsic sizing is the part that can go wrong quietly.

The container measures its SwiftUI content with
`hostingController.sizeThatFits(in:)` and writes the result into Fabric state, the
way `OneNativeSlotState` already carries size and origin. Yoga then lays the
container out at that size, which triggers `layoutSubviews`, which measures again.

That is a loop unless the write is conditional. The rule: only call
`setState` when the newly measured size differs from the state's current size by
more than half a point, and never during the layout pass that consumed the previous
state. The sheet slot already survives this pattern; a container measuring its own
content instead of receiving an allocation is the harder direction, because its size
depends on the width proposed to it.

Open questions the reviewer should push on, and that a runtime probe should answer
before the emitter changes:

- Does `sizeThatFits(in:)` on a controller whose root contains a `Form` return a
  stable height when the proposed width comes from Yoga, or does it need a layout
  pass first?
- What does it return while a composed child's model is still empty, on the frame
  between mounting the container and mounting its children? A zero-height container
  that then grows is a visible jump, not a correctness bug, but it needs a decision.
- Does a state write from `layoutSubviews` reach Yoga in the same frame, or does
  every size change cost a frame?

If the answers are bad, the honest fallback is a `height` prop on the container with
the same explicitness the leaf controls have today, and intrinsic measurement becomes
its own later stage rather than a silent approximation.

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

1. Runtime probe only: measure a `Form` in a hosting controller at a proposed width,
   write to Fabric state, and log every measure/layout cycle. Answer the three
   questions above. No catalog change.
2. `Host` plus `VStack`/`HStack` with the composed-child mechanism, carrying only
   already-generated leaf controls. No new SwiftUI bindings. This isolates the
   mounting and measurement work from catalog growth.
3. `Text`, `Label`, `Form`, `Section` as generated catalog entries that are
   containers or leaves within a host.
4. Explicit RN slot inside a host, reusing `OneNativeSlot` in `fill` mode.
5. Popover.

Stage 1 is a probe and stage 2 is the boundary. If stage 1 says intrinsic measurement
is not reliable, stage 2 still lands with explicit container heights and the rest of
the wave is unaffected.

## What this does not cover

Scroll views, lists, and grids. They need cell reuse and a measurement contract per
row, which is a larger boundary than this one and deserves its own proposal after a
host exists. Android rendering and browser rendering stay in
`plans/one-native-architecture.md`. The `schema.json` gaps named in the README
(accessibility mapping, an executable definition of slot `layout` values, and any
imperative ref/command/measurement contract) become more pressing once containers
exist, because a Soot implementation of a container needs the measurement contract
this proposal defines.
