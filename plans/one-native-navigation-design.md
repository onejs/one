# SwiftUI navigation ownership

**INFERRED, recommendation:** keep One's native stack as the sole app navigation owner. Start with
its existing title, toolbar, and search configuration. Bind actual SwiftUI navigation
only for an explicitly isolated flow after a runtime experiment establishes its boundaries.

Scope: written design, based on `4ea2cabda`. The assigned package floor is iOS 26.
The older iOS 18 statements in `packages/one-native/README.md:5` and
`plans/handoff-one-native-parity.md:22` are superseded by that instruction. No
availability-gating project is proposed. No iOS app was built or run.

## Evidence convention and sources

- **RAN** means a command was executed; source inspection establishes declarations
  and implementation text, not UIKit runtime behavior.
- **TESTED** requires multiple behavioral checks. No navigation UI claim below has
  this label.
- **INFERRED** identifies a conclusion from cited evidence, including recommendations.
- **GUESSED** identifies an unresolved runtime hypothesis. Prior runtime reports are
  not promoted into evidence from this pass.

**RAN:** inspected the three assigned documents, the controller, slot, composition,
  codegen, controlled-state, and One router sources. The reported baseline is 29
  components and zero bindings for the 22 navigation and eight search modifier
  families (`plans/one-native-swiftui-gap.md:8,73-78`). These are the prior inventory's
  counts, not a fresh coverage measurement. The generator discovers SDK interfaces
  and records declaration line numbers (`packages/one-native/codegen/inventory.ts:5-15,20-57`);
  exact constructor and modifier selection lives at `:101-142` of that file.

SDK references below use these explicit aliases. All were read from the installed
iPhoneSimulator26.4 SDK, not recalled API signatures:

- `SDK` = `/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneSimulator.platform/Developer/SDKs/iPhoneSimulator26.4.sdk/System/Library/Frameworks`.
- `S` = `SDK/SwiftUI.framework/Modules/SwiftUI.swiftmodule/arm64-apple-ios-simulator.swiftinterface`.
- `C` = `SDK/SwiftUICore.framework/Modules/SwiftUICore.swiftmodule/arm64-apple-ios-simulator.swiftinterface`.
- `U/<file>` = `SDK/UIKit.framework/Headers/<file>`; UIKit declarations imported
  by SwiftUI live here rather than in SwiftUI's interface.

**RAN:** fetched versioned upstream implementation sources matching the dependency
  declarations in `packages/one/package.json:196,286` and `package.json:100`:

- [screens 4.26.0 stack](https://github.com/software-mansion/react-native-screens/blob/4.26.0/ios/RNSScreenStack.mm), called `RNS-stack` below.
- [screens 4.26.0 header](https://github.com/software-mansion/react-native-screens/blob/4.26.0/ios/RNSScreenStackHeaderConfig.mm), called `RNS-header`.
- [native-stack 7.18.8 view](https://github.com/react-navigation/react-navigation/blob/%40react-navigation/native-stack%407.18.8/packages/native-stack/src/views/NativeStackView.native.tsx), called `RN-stack`.
- [RN 0.86.2 Fabric touch handler](https://github.com/facebook/react-native/blob/v0.86.2/packages/react-native/React/Fabric/RCTSurfaceTouchHandler.mm), called `RN-touch`.

**RAN:** the source-check independent variables were symbol name and dependency
  version. Missing signatures or different controller/gesture assignments would
  invalidate the corresponding mapping. These reads do not establish which exact
  dependency binary the existing simulator app contains.

## 1. A Fabric view can contain a stack, but containment is not integration

**RAN:** `NavigationStack` is a `View`, with root-only and bound-path constructors
  (`S:14187-14190`). `UIHostingController<Content: View>` accepts that view
  (`S:20743-20750`). Apple explicitly permits embedding a hosting controller as a
  child controller ([UIHostingController documentation](https://developer.apple.com/documentation/swiftui/uihostingcontroller)).
  One Native already attaches a hosting controller to the nearest controller in
  the responder chain, adds its view, and sizes it to the Fabric host's bounds
  (`packages/one-native/ios/OneNativeHostingController.swift:4-19`).

**INFERRED:** a bounded Fabric region is a viable construction shape for a local
  SwiftUI stack. There is no whole-screen requirement in those declarations or
  Apple's child-controller embedding contract. That establishes architectural
  feasibility, not tested gesture or transition correctness. Make a navigation
  host fill a bounded region; do not place it in the measured `Host` path, which
  asks for fixed vertical ideal size
  (`packages/one-native/ios/OneNativeComposition.swift:43-54`). Whole-screen sizing
  alone would still leave the same parent navigation controller above it.

**RAN:** One selects `createNativeStackNavigator`
  (`packages/one/src/layouts/stack-navigator.ts:1-9`). `RN-stack:362-365` renders
  route-keyed screen items, and `RNS-stack:620-671` applies them to its navigation
  controller through set, push, and pop operations. That controller installs its
  own gesture delegates, including iOS 26's content-pop recognizer
  (`RNS-stack:319-324`; `U/UINavigationController.h:86-91`).

**INFERRED:** nesting a SwiftUI stack does not transfer One's route ownership.
  An inner destination and the enclosing One screen are different histories.
  Letting both recognize back navigation over the same area leaves the target
  history ambiguous. Giving the inner host the whole screen does not settle it.

**RAN:** RN's surface recognizer sets `cancelsTouchesInView = NO`, but it also has
  failure/prevention and cancellation logic (`RN-touch:149-157,394-408`). Screens
  explicitly cancels RN touches in its ancestor chain when beginning recognized
  back gestures (`RNS-stack:774-853`), and handles scroll/pan precedence
  (`RNS-stack:1142-1191`). Ordinary embedded controls therefore are not evidence
  for interactive navigation compatibility.

**GUESSED:** an inner SwiftUI back gesture might cancel an RN press correctly, or
  leave its press active; competing outer gestures might win. Neither outcome
  was exercised here. Do not remove RN recognizers, replace screens' delegates,
  or add simultaneous-recognition overrides based on this hypothesis.

**RAN:** slots reparent the RN UIView and report native bounds to Fabric
  (`packages/one-native/ios/OneNativeSlot.swift:11-24,38-43`). Container slots use
  local coordinates and explicit height (`ios/OneNativeContainerSlotView.swift:18-30`
  under `packages/one-native`). Unlike popover content, their Fabric component
  does not install a surface touch handler
  (`packages/one-native/ios/OneNativeContainerSlotComponentView.mm:16-26`;
  `packages/one-native/ios/OneNativePopoverComponentView.mm:72-86`).

**INFERRED:** slot reuse preserves a transport and layout mechanism, not a promise
  that a pushed destination or search overlay retains the RN surface ancestry.
  Where a new presentation leaves that surface, use an explicit presented-content
  boundary with the existing touch-handler pattern. Do not attach extra handlers
  to every slot. RN Gesture Handler roots in presented content are an application
  boundary already documented in `packages/one-native/README.md:439-444`.

**RAN:** hosting supports public `safeAreaRegions` (`S:289-295`); container and
  keyboard regions are separate (`C:18249-18253`). The current attachment code
  sets frames but no explicit safe-area policy
  (`packages/one-native/ios/OneNativeHostingController.swift:12-19`). Fabric's slot
  state carries size/origin, not safe-area insets
  (`packages/one-native/cpp/OneNativeSlotShadowNode.h:9-12,29-34`).

**INFERRED:** define one inset owner per region. In the retained One stack,
  preserve the screen's existing header/inset contract. In an isolated full-flow
  SwiftUI host, give SwiftUI the full presentation bounds and let it allocate the
  content area below its own chrome; RN slots lay out inside that allocation.
  Do not add the same header or keyboard padding again in RN. **GUESSED:** actual
  double-insetting, keyboard avoidance, and large-title scroll coupling in a
  nested stack remain runtime questions, not established defects.

## 2. Kill automatic navigation-item sharing as the foundation

**RAN:** UIKit documents a unique navigation item for each view controller, and
  the navigation controller builds its bar from items belonging to controllers
  on its stack ([navigationItem](https://developer.apple.com/documentation/uikit/uiviewcontroller/navigationitem),
  [UINavigationController](https://developer.apple.com/documentation/uikit/uinavigationcontroller);
  `U/UINavigationController.h:70-72,137-139`). Being a contained child is different
  from being an entry in `viewControllers`.

**INFERRED:** a hosting controller directly pushed on the navigation stack can
  supply that entry's item. The current Fabric hosting controller is instead a
  child under the nearest controller. Its item is not automatically the RN screen's
  item. Reject the proposed automatic sharing contract. This is not a claim that
  every SwiftUI modifier always does nothing on every OS: incidental forwarding
  or explicit UIKit wiring is a separate behavior requiring its own experiment.
  Evidence: the unique-item contract above and
  `packages/one-native/ios/OneNativeHostingController.swift:7-17`.

**RAN:** screens selects the screen controller's `navigationItem`, installs its
  search controller, and explicitly clears search when its header configuration
  has none (`RNS-header:479-480,604-607,643-644`). The existing native toolbar also
  deliberately finds a screen controller and writes its toolbar items
  (`packages/native/ios/Toolbar/ToolbarHostView.swift:46-77,118-136`).

**INFERRED:** assigning a child host's item, copying items after layout, or letting
  two writers manage the same search controller is not an acceptable integration.
  Even an initially visible search field would not prove stability across the
  next screens header update. Use the screen owner to configure chrome.

The useful subset without owning a back stack is screen chrome, exposed through
One's integration layer. It is not a new set of freestanding SwiftUI modifiers:

| Surface | Recommendation and evidence |
|---|---|
| Title and display mode | **INFERRED:** use the existing header-title option mapping first (`packages/one/src/layouts/stack-utils/StackHeaderTitle.tsx:67-81`). Actual SwiftUI `navigationTitle` exists at `S:17596-17622`, but no child-item propagation contract follows from its signature. |
| Toolbar actions and menus | **INFERRED:** extend the existing toolbar registration/configuration seam if a caller needs more (`packages/one/src/layouts/stack-utils/StackToolbarImplementation.tsx:21-38`). SwiftUI toolbar content is a separate builder contract (`S:17352-17356`, `S:6574`, `S:2777`). |
| Bar background, visibility, color | **INFERRED:** keep these with the same screen-header owner. Do not advertise full `ShapeStyle` or SwiftUI placement semantics as UIKit option aliases (`S:9546-9573` declares the genuine modifier surface). |
| Search text and submission | **INFERRED:** start with `Stack.HeaderSearchBar`'s existing `headerSearchBarOptions` mapping (`packages/one/src/layouts/stack-utils/StackHeaderSearchBar.tsx:6-24`). An exact controlled-text contract needs its own assessment; this mapping alone does not establish one. |
| SwiftUI `searchable` | **INFERRED:** defer as a genuine binding until there is an explicit SwiftUI navigation context. Its text binding exists at `S:5528`; Apple's [search-interface guide](https://developer.apple.com/documentation/swiftui/adding-a-search-interface-to-your-app) places it on or inside a SwiftUI navigation container. A naked child host is not a verified substitute. |

**INFERRED:** the smallest useful navigation work may add zero Fabric components.
  Bindings should close a caller capability gap rather than duplicate the title,
  search, and toolbar paths cited above. If SwiftUI-rendered custom header content
  is required later, mount it through an explicit slot owned by the screen header.
  That is content hosting; it does not authorize SwiftUI to manage the screen's bar.

## 3. If a stack is bound, its path needs an explicit router adapter

**RAN:** the reconciliation primitive is generic over `Equatable`, not scalar-only
  (`packages/one-native/ios/OneNativeControlled.swift:2-26`). The JS hook accepts
  any event extending `{eventCount, revision}` and acknowledges in `finally`
  (`packages/one-native/src/controlled.ts:3-29`). The leaf catalog limits controlled
  values to scalars, and each leaf has one value channel
  (`packages/one-native/codegen/controlTypes.ts:2,24-31,46-49`;
  `packages/one-native/codegen/emitControls.ts:198-202,240-249`).

**RAN:** a host-only Swift probe compiled/executed the unchanged controlled struct
  with `[String]`. Independent variables: proposed path, acknowledged event count,
  and revision. Assertions covered append, acceptance, rejection, stale ack, pop,
  and reset. Output: `PASS array path: optimistic append, pending external write
  ignored, accept, stale ack ignored, reject, pop, revision reset`. In particular,
  an external write with ack 0 was ignored after event 1; changing revision applied
  it and reset the count. The temporary probe was removed. This proves no UIKit,
  Fabric delivery, React scheduling, or navigation animation behavior.

**INFERRED:** reuse the primitive with a typed `[String]` path of route-instance
  keys, plus a separately keyed destination registry. Do not use URL strings as
  instance identity: the same destination must be pushable twice. The SDK accepts
  a mutable, range-replaceable random-access collection of hashable elements
  (`S:14190`), value links (`S:10110-10111`), and typed destination lookup
  (`S:1436`). Add an explicit path prop/event to a navigation container; extending
  the scalar leaf recipe is not sufficient to supply destination slots or lifecycle.

Proposed transaction mechanism:

1. **INFERRED:** JS route change resolves to an ordered list of instance keys.
   Mount every newly required destination before publishing the path that references
   it, in a coherent Fabric update. Enable native links only when their destination
   is registered and ready. Feed the path, acknowledged event, and revision
   to `applying`. Programmatic changes must advance revision when superseding pending
   native work. The need follows from the probe and `OneNativeControlled.swift:9-18`.
2. **INFERRED:** native `NavigationLink(value:)` or a back operation writes the path
   binding. Call `change`, publish the optimistic path, and emit
   `{path, eventCount, revision}`. JS deduplicates through `useControlled` and decides
   the accepted path synchronously. Echo that path with the acknowledgement; retaining
   the prior path rejects the change (`controlled.ts:17-29`; the Swift primitive
   `:21-26`). An asynchronous router decision cannot be assumed accepted merely
   because its dispatch was issued.
3. **INFERRED:** while a newer native event is pending, older acknowledgements do
   not win. Revision resets invalidate earlier JS events. Do not re-emit native
   events for a prop application; separate binding setters from reconciliation,
   as the existing TextField model does
   (`packages/one-native/ios/Generated/OneNativeTextFieldView.swift:19-22,44-45,93-95`).
4. **INFERRED:** keep destination slots alive until transition completion, including
   cancelled back gestures. The controlled protocol has no transition phase, mount
   readiness, or completion signal (`OneNativeControlled.swift:2-26`). Those need
   an explicit navigation lifecycle contract. A binding rollback after removal
   cannot substitute for preventing a blocked removal before it starts.

**RAN:** One routes URL pushes/replaces through `linkTo`, and dispatches stack pop
  operations (`packages/one/src/router/router.ts:428-463,1434`). Native-stack sends
  dismiss counts back as targeted `StackActions.pop` actions
  (`RN-stack:597-611`). One's blocker uses `usePreventRemove` and later dispatches
  the captured action (`packages/one/src/useBlocker.native.ts:82-102`).

**INFERRED:** two integration models are coherent, but only the first is worth a
  future experiment now:

- **Isolated flow:** One owns the outer route or presentation. A local JS controller
  owns the accepted inner path; SwiftUI renders and transitions that path. Native
  pushes update local JS through the protocol, not `router.push`. Exiting the flow
  emits one explicit outer action. Outer URL changes do not mirror the inner path;
  leaving/resetting the owning route disposes/resets the flow. Prefer a separate
  presentation for the experiment, with an explicit dismissal policy. Support that
  boundary first; do not initially offer an inner stack sharing an outer screen's
  back-gesture region. A dismissal exits the flow; an inner pop never dismisses it.
- **One router backend replacement:** if inner destinations must be real One routes,
  replace native-stack for that navigator with a SwiftUI renderer of the router's
  accepted state. Native path mutations become targeted router actions, and accepted
  router state becomes path props. Keep one renderer for each history. This needs
  router acceptance timing, route mounting, linking, blocker, focus, restoration,
  and transition work beyond the value protocol. Do not ship it in this scope.

**INFERRED:** wiring an inner native push to ordinary `router.push` while also
  retaining native-stack for those routes would ask both the outer renderer and
  the inner binding to push. The two source paths above establish why simple
  bidirectional mirroring is the wrong architecture.

## 4. Search: reusable mechanisms and missing semantics

| Part | Already supported | Still required |
|---|---|---|
| Text binding | **RAN:** the String controlled model and binding setter exist (`packages/one-native/ios/Generated/OneNativeTextFieldView.swift:7-22,93-95`). SDK `searchable` takes `Binding<String>` (`S:5528`). | **INFERRED:** reusable as a search channel, once the search context is owned. `isPresented` is another binding (`S:5546`), so simultaneous text and presentation need independent acknowledgements or a deliberately defined aggregate value. The one-value leaf recipe does not supply that automatically. |
| Suggestions slot | **RAN:** `searchSuggestions` takes ordinary `ViewBuilder` content (`S:10270`). The emitter describes one composed content slot and an RN content slot (`packages/one-native/codegen/emitContainers.ts:4-9,43-60`); composition publishes `AnyView` children with native identity (`packages/one-native/ios/OneNativeComposition.swift:63-71`). | **INFERRED:** reuse composition and `OneNativeSlot` for content, but add explicit body-versus-suggestions routing, bounded suggestion layout, and a presentation touch boundary if needed. Existing `Slot` requires height (`packages/one-native/src/Containers.native.tsx:81-94`). A React subtree is not automatically a native search suggestion with completion semantics. Apply typed completion to native suggestion rows (`S:13891`), or send an explicit selection event from RN. |
| Scope bar | **RAN:** `searchScopes` needs a hashable selection binding and builder content (`S:2326,2349`); typed tags are declared at `C:11498`. Current container metadata has height/width and content, but no scope IDs, tags, or selected scope (`emitContainers.ts:43-60`). | **INFERRED:** the transport is reusable, the scope semantics are missing. Prefer finite `{id, label}` data mapped to tagged native labels plus a separate controlled selected ID. An opaque RN slot cannot stand in for multiple typed scope choices. Validate IDs and selection before native submission. |

**INFERRED:** begin with text only and a concrete search caller. Add native,
  data-driven suggestions before arbitrary RN suggestions. This keeps the number
  of mounted Fabric subtrees proportional to visible supplied suggestions rather
  than a whole result corpus. Querying/filtering remains the caller's responsibility;
  the search binding should report text, not fetch data.

**RAN:** the SDK also declares search selection, focus, presentation-toolbar,
  toolbar, and dictation behavior (`S:862,5711-5716,18859,18882,18890`), and token
  overloads (`S:11107-11112`). These signatures introduce additional state types;
  the eight-family inventory total is not eight interchangeable scalar props.

## 5. Phases and explicit exclusions

1. **INFERRED, smallest useful delivery:** document and demonstrate the existing
   One title, toolbar, and header-search path against an actual caller. Where
   a concrete capability is missing, extend that owner and its existing registration
   seam. Cost: no second navigation history and no additional screen hosts. See
   the mappings in section 2. Do not claim increased SwiftUI modifier coverage.
2. **INFERRED, experiment before bindings:** isolate a full-flow SwiftUI host in a
   separately owned presentation. Start with a root and one destination, native
   title/actions, and text-only search. Exercise the matrix below on an authorized
   device. Cost: a container, path channel, destination lifetime management, and
   gesture/inset validation. Stop if public APIs cannot meet the contract.
3. **INFERRED, conditional binding:** only after that experiment succeeds, expose
   a clearly local `NavigationStack` flow with value links and registered keyed
   destinations. Add title, toolbar actions, limited background/visibility, then
   suggestions and scopes as demand justifies. SDK contracts are in `S:14187-14190`,
   `S:10110`, `S:1436`, `S:17352-17356`, `S:9546-9567`, and section 4. Keep destination
   lookup keyed; publish path changes in O(depth), not per animation frame. Retain
   only active/in-flight destinations rather than eagerly mounting the route catalog.
4. **INFERRED, separate product decision:** a SwiftUI backend for One's router is
   a renderer replacement with navigation conformance work, not another catalog
   wave. Defer it until a concrete benefit justifies replacing the existing route,
   dismissal, and blocker integration cited in section 3.

The following runtime matrix is proposed, **not run**. Every row names the
independent variable and an observation capable of rejecting the design:

| Independent variable | Required observation / failure criterion |
|---|---|
| Hosting controller directly on UIKit stack versus contained under an RN screen; no inner stack | Assert controller identities, parent chain, top navigation item, and mounted content first. Change title, toolbar, background, and search separately. Record which item changed and what painted, then force a screens header update. Visible chrome on the direct host alone does not establish sharing for the contained host. |
| Bounded embedded region versus full-flow presentation; inner depth zero versus one | Assert both path histories before and after pushes. A local push changes only the inner path. RN presses/scrolls still work after entering and leaving the destination. |
| Completed versus cancelled edge/content swipe; RN Pressable and horizontal scroll at the touch origin | Assert exactly one intended pop on completion, none on cancellation, no stray press, and no outer route change. Include iOS 26 content-pop gestures. A screenshot is insufficient. |
| Header visible/hidden, keyboard shown/hidden, rotation, large-title collapse | Measure host bounds, hosting safe-area insets, RN content frame, and scroll insets. Fail for repeated padding or obscured interactive content. Compare the same layout under the current One stack. |
| Delayed JS acknowledgement, two quick native changes, external reset, blocked removal | Assert final path, revisions/counts, mounted destination keys, and transition completion. A rejected pop must satisfy the chosen pre-transition policy; a later push-back animation is not proof. |
| Native versus RN suggestions; scope changes; search dismissal/remount | Assert displayed text and selected ID, completion event count, touch delivery, retained React state, and absence of stale presented content after disposal. |

Do not build:

- A second app back stack mirrored to native-stack, or a NavigationLink that both
  mutates a SwiftUI path and calls One's outer router.
- Automatic parent navigation-item sharing, item-copy observers, private SwiftUI
  controller introspection, or global gesture-delegate replacements.
- Freestanding `navigationTitle`, `toolbarBackground`, or `searchable` props on
  arbitrary leaf controls with an implied outer-header effect.
- A second toolbar/search abstraction duplicating One's existing integration.
- All navigation/toolbar/search overloads merely to reduce the inventory gap;
  defer customization persistence, editable titles, title menus, token editing,
  programmatic search focus/selection, and arbitrary RN scope builders.
- `NavigationSplitView`, app-router replacement, or navigation transitions in the
  initial binding. No fallback renderer or iOS availability work is needed here.

**GUESSED, single riskiest unknown:** whether an isolated SwiftUI stack hosting RN
  destination slots can complete and cancel iOS 26 interactive back navigation
  while cancelling RN touches correctly and retaining destination lifetime. The
  interfaces and existing controlled protocol do not answer this. The gesture,
  lifetime, and delayed-ack rows above are the release gate for any future binding.

Delivery: design-only branch `feat/one-native-nav`; leave its worktree clean with
the proposal committed and pushed. No native CI watcher is needed for this document.
