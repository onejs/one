---
id: t-mtwigntu-14t50
title: Continue generated SwiftUI parity and Soot conformance
status: canceled
backend: git
sessions:
- r25793
- r26032
commits:
- 9347db0d78538cd7a619c956aaa92e26e805420c
created_at: 1789104225954
updated_at: 1793089837166
field_marks:
  active_form: 1789104225954
  body: 1793089837166
  claim: 1789104225954
  evidence_summary: 1789104225954
  owner_status: 1789104225954
  parent: 1789104225954
  priority: 1789104225954
  recovery_ref: 1789104225954
  status: 1793089837166
  title: 1789104225954
---
Continue from feat/one-native. Read plans/handoff-one-native-parity.md, plans/one-native-coverage.md, and plans/one-native-layout-design.md. No release authorized.

## Status at ac31a84e9 (pushed)

15 generated controls plus the hand-written Sheet/Menu/Tabs hosts, and the Host/Form/Section containers, Slot and Popover for native composition.

Nine simulator suites pass on iPhone 16 / iOS 26.4: tabs-menu 58, pickers 29, forms 31, sheets 34, leaves 71, dialogs 32, host 27, containers 29, popover 26. generate:check verified (SDK 26.4, 9715 declarations, 126 mapped symbols, 89 generated files), typecheck clean, 19 unit tests pass, native Debug build has zero errors.

## Layout wave: all six stages landed

Review r26161 (codex xhigh, read-only) held Option B and found by reading that a composed control would render and never emit, because activation was gated on a window a composed child never gets. Confirmed and fixed: composed controls activate on publication.

Stage 1 probe (temporary Fabric component, since removed), RAN:
- Write only the measured HEIGHT into Fabric state. Pinning both axes via setSize made the container ignore its parent's width.
- sizeThatFits(in:) at the Yoga width works; intrinsicContentSize ignores the proposed width. The returned width is SwiftUI's ideal, smaller than the proposal, so only the height is usable.
- Form has NO intrinsic height: infinity proposal returns 0, 10000 proposal returns 10000, at every row count and width. VStack and Text agree under both.
- A state write from layoutSubviews reaches Yoga in the SAME display frame. The loop terminates (frozen at 38 measures / 15 layouts / 7 writes over five idle seconds).
- Measuring in the same turn as the model write returns the previous content's height.
- Negative control: with every explicit schedule removed, layoutSubviews ran exactly ONCE. A UIKit-side measurement must schedule its own remeasure.

Stages 2 and 3, RAN in the host suite:
- OneNativeComposable in ios/OneNativeComposition.swift. Each generated control returns its own AnyView from compositionContent(), so the host never names a control's private types.
- The standalone fill frame moved out of the generated content into a wrapper the standalone hosting controller applies; composed, that frame made a control take whatever the stack offered.
- The host measures from SwiftUI (onGeometryChange under fixedSize(vertical: true)) rather than from layoutSubviews, which removes the scheduling problem the probe found. Heights at 361pt: one Toggle 28, three children 84, spacing 20 gives 124, a wrapping child label gives 107.
- All three composed control kinds emit and React accepts the value; the native Stepper AXValue follows React. Composition survives two recycling cycles.
- Known limits, documented in the README: a composed child's React Native view props land on a UIView nobody displays (SwiftUI supplies the accessibility element), and a horizontal host of width-greedy controls overflows, so SwiftUI reports a much taller ideal height.

Stage 4, RAN in the new containers suite:
- Text and Label are ordinary generated leaf controls from codegen/leafCatalog.ts, display only, 24pt default standalone height.
- Containers are one thing, not three. OneNativeContainerView owns the children, the publication into SwiftUI, the composition state and the standalone hosting controller; Host, Form and Section differ only in the SwiftUI container they wrap the published children in. A container is composable itself, so Form > Section > Toggle and a Host inside a Section both work with no container knowing its parent.
- A Toggle two containers deep emits and its native AXValue follows React. A Section mounted later, a Section prop change (footer) and a Section unmount all reach SwiftUI through the published tree.
- A Form gets its height from React Native style (default flex: 1), not from a prop; it fills its Yoga box at 484pt in the fixture.
- A Form composed into a measured Host reports 0 and renders nothing (RAN: wrapping the fixture's Form in a Host gave Form: 0 and the whole form vanished from the AX tree). It follows from stage 1's Form finding but fails silently, so Swift.Host now throws when a direct child is a Swift.Form.
- The schema had Host as interfaceOnly: false while the emitted spec passed true; the container emitter now takes it from the component record.

Stage 5, RAN in the containers suite (now 29 assertions):
- Swift.Slot carries a React Native subtree into a Host, Form or Section. It reuses ios/OneNativeSlot.swift and the templated cpp/OneNativeSlotShadowNode.h, so no new measurement machinery. SwiftUI proposes the box from an explicit height prop, the state writes it back to Yoga, and the subtree lays out inside it. A slot row in a Section and a second one in a Host composed into a later Section both render in order and take taps.
- The slot's origin is LOCAL, like presented sheet content. I first gave it a layout host to convert to window coordinates; the tap still missed, which proves the origin is not what routes touches on iOS. Reverted.
- An HStack offers a representable no width, so a slot in a horizontal host needs an explicit width prop. Without it the box collapsed to zero width.
- The slot view must leave the SwiftUI tree in decompose(). React Native recycles the component view in the same transaction that unmounts it and asserts it has no superview, while SwiftUI dismantles the representable later: unmounting the second Section crashed with the RCTComponentViewRegistry assertion until decompose() removed it.
- The nested slot's first tap failure was NOT any of the above. The Form ended at y=686 and the row spanned 671 to 701, so the center tap landed outside the scrollable Form. Compacting the fixture's status lines into a wrapping row (Form 434 -> 534) made the same tap pass.

Stage 6, RAN in the new popover suite (26 assertions):
- Swift.Popover is a measured container whose children are the trigger and whose content prop is a presented React Native subtree. No new mechanism: the trigger is OneNativeContainerView composition, the body is the sheet's presented slot (OneNativeSlot plus the shared slot shadow node).
- The Host's height-only Yoga write is now a template, OneNativeMeasuredShadowNode, with an OneNativeMeasuredComponentView base on the ObjC side, so the host and the popover trigger share one measurement contract. Both suites still pass unchanged (host 27, containers 29).
- SwiftUI sizes a popover from its content and an RN subtree has no ideal size, so contentWidth and contentHeight are required, the same bargain Slot makes with height.
- The anchor is the trigger's own bounds. The trigger stack hugs its content and an outer frame(maxWidth: .infinity, alignment: .leading) puts it at the leading edge; written the other way round the arrow points at the middle of the row. Screenshot confirms the arrow on the button.
- The presented subtree takes taps and dismisses itself; a tap outside reaches React through the controlled protocol. The proof is that React can present it again afterwards, which a lost event would make a no-op.
- Edge and PresentationAdaptation are now generated enums, so arrowEdge and presentationCompactAdaptation are validated in JS and converted in Swift. The default adaptation presents the body as a full-height sheet on an iPhone, which the fixture's composed-in-a-Section popover covers; it dismisses by drag, not by tapping outside.

## Remaining

1. Sheet sizing-to-content, selected detent binding, presentation background/interaction/sizing, and the presenting: value-bound alert overloads are still unimplemented. A composed child's inherited ViewProps land on a UIView nobody displays, which the catalog should map or reject.
2. Soot schema integration. Soot intercepts by native view name through registerNativeComponentImplementation. Premature until one-native has a consumer.
3. Migrate @vxrn/native by caller behavior. Callers are almost entirely test fixtures, the docs page, and two files in ~/soot.

Team Machine canceled this task: untouched for 7+ days with no live assignee. Reopen with `tm task update t-mtwigntu-14t50 --status open`.
