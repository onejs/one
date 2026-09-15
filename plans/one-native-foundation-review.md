I'll start by understanding the scope of the uncommitted changes.
## Assembled review: one-native foundation (uncommitted vs 3dcfe61d2)

Validation I ran myself: `bun run test` 17/17 pass; `bun run generate:check` exit 0 in 3.2s (SDK 26.4, 9399 declarations, 31 mapped symbols, no tracked file modified); standalone `swiftc -typecheck` of `ios/*.swift ios/Generated/*.swift` at `arm64-apple-ios18.0-simulator` exit 0 in 0.87s; a Combine probe for finding 2; three SDK inventory queries for finding 4. No simulator, no edits, no spawns.

The controlled protocol, the slot unification, the exact-signature constructor selection and the emitted schema are all the right shape. Five things to fix.

---

### 1. A recycled Menu renders no items (correctness regression) — `ios/OneNativeMenuComponentView.mm:57`

The items memo moved from `OneNativeMenuView.currentItems` (which `reset()` cleared) to `_props`, and `_props` survives recycling.

Premises, all READ in `node_modules/react-native` 0.86.2:
- `RCTViewComponentView.mm:687-726` `prepareForRecycle` resets `_eventEmitter`, `_reactSubviews`, `_layoutMetrics`. It does not reset `_props`.
- `RCTMountingManager.mm:83` mounts with `updateProps:newChildShadowView.props oldProps:nullptr`; your override ignores the `oldProps` argument and reads `_props`.
- `RCTComponentViewRegistry.mm:89-98` dequeues from a per-handle recycle pool; `RCTComponentViewClassDescriptor.h:34` defaults `shouldBeRecycled{true}` and one-native declares no `+shouldBeRecycled` (RAN: grep, none).

INFERRED from those: mount a Menu with items X, unmount the screen, mount another Menu whose items are structurally identical. `prepareForRecycle` calls `[_menuView reset]`, which replaces the model so `children`/`items`/`propValues` are empty, but `_props.items` still equals X, so `OneNativeMenuItemsEqual` returns true and `configureItems` never runs. The trigger renders, the menu opens empty, toggles are inert. The conformance runner never leaves and re-enters the fixture route, so it cannot catch this.

Fix at the source: reset `_props` in `prepareForRecycle`, or keep the memo next to the state it guards (back on `OneNativeMenuView`, cleared by `reset()`). `OneNativeTabComponentView`'s `_tabId/_title/...` change check has the same shape and is latent only because `mountChildComponentView` re-invalidates unconditionally; fix both under one rule.

### 2. `OneNativeControlled.apply` publishes on every prop update — `ios/OneNativeControlled.swift:9`, called at `OneNativeMenuView.swift:64` and `OneNativeTabsView.swift:57`

RAN, scratchpad Combine probe with your exact struct:

```
guarded assignment fires: 0
apply-with-no-change fires: 5
```

A mutating call on a `@Published` struct goes through the wrapper's setter, so `objectWillChange` fires whether or not anything changed. The code this replaced guarded every write (`if acknowledgedEvent >= model.eventCount && model.selection != selection`, `if model.label != triggerLabel`). Now every `updateProps` invalidates the SwiftUI body: `TabsContent` rebuilds the `TabView` and runs `OneNativeSlot.updateUIView` plus `setNeedsLayout` for every page, and `OneNativeMenuRoot` re-evaluates including a presented menu's content. `updateProps` fires on any real prop change, including each acknowledgement round trip (function props normalize to `true` before diffing at `ReactNativeAttributePayload.js:254-267`, so closure identity alone does not, READ).

Not a visible bug in what you tested, but it is a churn regression in the one type six more controls are about to inherit. Have `apply` report whether it changed and assign back only then, or hold `controlled` as a plain var and send `objectWillChange` on real changes.

### 3. Nothing in CI compiles the generated ObjC++, or any app that uses the package

`generate.ts:405` typechecks `ios/*.swift` and `ios/Generated/*.swift` only. The new `ios/Generated/OneNativeMenuPayload.h` (equality helper plus payload converter, the item 3b deliverable) and all three `.mm` files are compiled by nothing in `generate`, `generate:check`, or CI.

RAN: `tests/rn-test-container` has no `one-native` dependency in its package.json or Podfile.lock, so the workflow whose path filter you extended builds an app that does not consume the package; `grep -rl native-features .github/workflows` returns nothing, so the only consumer is never built. The new `generated-swiftui` job is Swift typecheck plus TS typecheck plus vitest. Generated C++ with a wrong type would surface on a developer machine only.

### 4. Modifier selection is still an unguarded `.find()`, and the extractor cannot express what separates style modifiers — `generate.ts:46-58`

RAN against iPhoneSimulator 26.4. Every style modifier the control wave needs has exactly one available single-parameter `View` overload whose parameter type is `S`: `pickerStyle`, `datePickerStyle`, `toggleStyle`, `gaugeStyle`, `progressViewStyle`, `textFieldStyle`, `menuStyle`, `labelStyle`. `buttonStyle` has **two**, and their extracted `Declaration` records are identical field for field:

```
{"attributes":["@available(iOS 13.0, macOS 10.15, tvOS 13.0, watchOS 6.0, *)"],"kind":"func","name":"buttonStyle","owner":"SwiftUICore.View","parameters":[{"label":"_","name":"style","type":"S"}],"type":"some SwiftUICore.View"}   (line 8076)
{... identical ...}                                                                                                                                                                                                                        (line 9964)
```

They differ only by `where S : ButtonStyle` vs `where S : PrimitiveButtonStyle`, which `Extract.swift` does not capture. Today only `ControlGroupStyle` reaches the hardcoded `parameters[0].type === 'S'` escape at line 54; generalizing that escape, which the control wave requires, makes `buttonStyle` a silent coin flip. That is exactly the defect `selectConstructor` was written to kill, left unfixed one function above it.

Same gap on constructors, but deferred rather than immediate. With exact label-plus-type keys, residual ambiguity across the expansion targets is **zero**: Picker 40/40, DatePicker 16/16, ColorPicker 8/8, Toggle 21/21, Slider 9/9, Stepper 20/20, TextField 33/33, ProgressView 16/16, Gauge 5/5 distinct signatures. `Section` still has 7 ambiguous signatures, including `Section(content:)`, `Section(_:content:)` and all three `isExpanded:` variants, every one of them in the Layout/forms row of the coverage matrix. Those will throw loudly rather than mispick, which is the good half of the fix working.

Add generic requirements to `Declaration`, key modifiers on name plus parameters plus requirements, and give modifiers the same one-match-or-throw rule as constructors. This is the single highest-value generator change before the control wave.

### 5. `generate:check` byte-compares toolchain provenance

`swiftui-manifest.json` embeds `swiftc --version`, the SDK version, and the sha256 of both `.swiftinterface` files, and `--check` diffs it alongside the code. A runner-image Xcode rebuild that changes no generated output still fails every one-native PR with "Generated SwiftUI bindings differ: codegen/swiftui-manifest.json". Keep the manifest as provenance, exclude it from the `--check` comparison; the code outputs already catch real drift.

### Smaller

- `unmappedModifiers` lists `menuStyle` and `tabViewStyle` as unbound, but both are bound by hand in `OneNativeMenuView.swift:118` and `OneNativeTabsView.swift:113-114`. The README calls this list "unbound menu/tab modifier names", so the provenance artifact overstates the gap.
- `src/specs/OneNativeTabNativeComponent.ts` imports `DirectEventHandler, Int32` and uses neither; the emitter adds the import unconditionally.
- The conformance runner locates the `Tab Bar` node's frame but then taps a hardcoded `y = 783`. Using the found bar's midpoint would survive `tabBarMinimizeBehavior` and search-role layout shifts.
- Known in-flight, not counted as a finding: `bun run typecheck` currently fails with exactly one error, `src/menuItems.ts(398,67): Property 'type' does not exist on type 'never'`. `codegen/menuValidator.ts` already emits `input.type`; `src/menuItems.ts` needs regenerating. CI runs typecheck, so the tree is red until that lands.

---

## Next expansion

**The template-per-leaf plan is right, and the SDK backs it.** Zero residual constructor ambiguity across all six families means the catalog-entry-per-control model works as designed. Do finding 4 first, because the style modifier each of those families needs is the part that silently mispicks.

**Generate the ObjC++ component view from the same template, not just the Swift recipe.** Each host currently hand-writes an `.mm` with event-emitter and prop plumbing. Six families means six near-identical copies in the one language nothing in CI compiles (finding 3). The payload/equality emitter already proves the generator can emit C++ per host; extend it rather than growing a copy-paste site.

**Leaf controls are the first components with no RN subtree and therefore no source of size.** A `<Swift.Toggle />` with no width, height or flex is 0x0 under Yoga, since a plain `ConcreteViewShadowNode` measures from its Yoga style. Bounded RN styles is the right v1, but make the failure loud: a dev error when the Fabric frame is empty, not an invisible control.

**Sheets need one change to the slot geometry policy, not zero.** `fill` publishes `convert(bounds, to: layoutHost)` and the origin lands in `OneNativeTabShadowNode::getContentOriginOffset` (`cpp/OneNativeTabShadowNode.h:25`), which corrects descendant touch coordinates. A presented sheet's slot is in a different window from `layoutHost`, so that conversion encodes the presenting view's screen position and would shift hit-testing for the entire sheet subtree. Add a presented mode that publishes size only with a zero origin and roots the Fabric subtree at the slot. That is the third mode the review reserved, and sheets make it required rather than deferrable. Extracting shared state/descriptor mechanics instead of a JS measurement loop is otherwise correct.

**No universal tree engine, no Nitro.** Nothing in this change weakens that; the `unclear` rows in the Fabric/Nitro table (custom State, `getContentOriginOffset`, child mount interception) are all still load-bearing here.

## Owner disposition

- Keep Fabric `_props` across recycling because RCTViewComponentView diffs them against retained UIView properties. Invalidate only our content caches with dirty flags for menu items, picker options, and sheet detents. The suggested `_props` reset produced a visible but accessibility-hidden recycled tab page in the simulator; repeated route entry checks native accessibility and identical menu payloads.
- Replace mutating controlled-prop application with an optional changed copy, assigning published state only when it changes.
- Compile the native-features consumer in CI, including generated ObjC++ and custom shadow nodes.
- Extract generic requirements and select modifiers by exact signature and requirements, failing on ambiguity.
- Keep byte-exact SDK provenance checking with the pinned Xcode version. SDK changes require an intentional regeneration and review.
- Generate typed leaf hosts and their ObjC++ adapters from the same catalog. Give controls default heights and document bounded parent width; zero-sized transient layouts remain valid.
- Share native slot state and descriptor mechanics. Presented content reports a local zero origin and attaches its own Fabric touch handler.
- Namespace Fabric event names per component. Runtime control mounting exposed React Native's global direct/bubbling event-name registry collision with `onChange`.
