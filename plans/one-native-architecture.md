Build `one-native` as a generated SwiftUI component layer on Fabric, with explicit ownership of every layout boundary. Prove React Native → SwiftUI → React Native → SwiftUI composition before expanding the component catalog. The generator can reduce repetitive bindings; it cannot generate the layout, interaction, and state semantics that make this composition work.

This is an engineering proposal, not an implemented or runtime-validated design. Research used the current One checkout and upstream documentation/source. The requesting session assigned `REVIEW: none`; no additional review was spawned. This document does not authorize implementation or publication.

**Corrections that affect the design**

- Expo already supports React Native content inside SwiftUI through `RNHostView`, including content-sized and parent-sized modes. The differentiation should be automatic boundaries, predictable semantics, generated coverage, and Tamagui integration. [Expo RNHostView](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/rnhostview/)
- `mgcrea/react-native-swiftui` is by Olivier Louvignes. Its current implementation combines Nitro with JSON tree transport and string prop updates. Nitro does not make that transport free. Source inspected at `b2e29dbc87bab0f3ce2a985a66d87a1261f50bec`: [root component](https://github.com/mgcrea/react-native-swiftui/blob/b2e29dbc87bab0f3ce2a985a66d87a1261f50bec/src/components/SwiftUI.tsx), [native root](https://github.com/mgcrea/react-native-swiftui/blob/b2e29dbc87bab0f3ce2a985a66d87a1261f50bec/ios/HybridSwiftUIRootView.swift), [project](https://github.com/mgcrea/react-native-swiftui).
- Apple documents that modifier order changes behavior. A flat-prop order is a One API contract, not an Apple HIG standard. [Apple view configuration](https://developer.apple.com/documentation/swiftui/configuring-views)
- A browser adapter avoids shipping a Swift runtime. It still adds JavaScript, shaders, assets, and maintenance. Existing CanvasKit availability and incremental payload in Contrast/rnx/SootSim were not inspected in this task. Exact SwiftUI behavior and zero additional bytes are not established claims.
- A regular SwiftUI material such as `ultraThinMaterial` and Liquid Glass are distinct effects. The API should preserve that distinction. Expo documents `glassEffect` as requiring iOS 26 and Xcode 26 or later. [Expo SwiftUI guide](https://docs.expo.dev/guides/expo-ui-swift-ui/)

**1. Package and runtime ownership**

Use `packages/one-native`, published eventually as `one-native`, exporting `Swift`. The existing `packages/native` already publishes `@vxrn/native` and contains navigation-specific UIKit integrations. Its toolbar implementation uses `RCTView` and `insertReactSubview`; its pod targets iOS 15.1. Those are useful reference points, but they are not a general SwiftUI/Fabric layout engine. Keep navigation ownership there until a separate migration is justified.

Proposed source layout:

```text
packages/one-native/
  src/
    index.ts                  platform-safe public exports
    index.ios.ts              Swift exports backed by native components
    generated/                public props, enums, component adapters
    specs/                    generated Nitro view contracts
    binding/                  controlled-event adapter
    tamagui/                  optional theme/token integration
    preview/                  schema adapter entry point
  ios/
    Hosting/                  hosting-controller containment and lifecycle
    Fabric/                   Objective-C++ mount/layout integration
    Slots/                    UIViewRepresentable and boundary measurement
    State/                    native control state and event routing
    Generated/                typed factories and modifier dispatch
  cpp/                        shadow nodes, layout state, commit integration
  codegen/
    Package.swift             toolchain-pinned SwiftSyntax executable
    Sources/
    policy/                   semantic mappings and exclusions
    schema/                   normalized API contract and SDK manifest
  nitrogen/generated/
  OneNative.podspec
  react-native.config.cjs
tests/one-native/             one integration app and its behavioral fixtures
```

Use React, React Native, and Nitro as peers. Keep Tamagui integration behind a separate entry point; plain React Native consumers should not require Tamagui, One navigation, or Expo. Follow the repository's existing build/export conventions when scaffolding. The root checkout currently resolves React Native 0.86.2, so start with that exact version instead of claiming a wide support range.

Propose iOS 18 as the initial general component baseline, with iOS 26 required for Liquid Glass. This is a product scope choice, not an inferred requirement of SwiftUI. Record minimum build SDK and minimum runtime OS separately. Unsupported requested native features should produce an actionable error. Do not silently substitute a blur for glass. Availability metadata should let application authors choose an explicit alternative.

Use Nitro for typed prop conversion, event callbacks, references, and commands. It provides Fabric-backed views and update batching, but custom subtree layout and mounting still need a Fabric integration layer. Normal React prop updates reach Nitro views on the UI thread; imperative hybrid-reference updates may arrive on another thread. Public APIs must preserve main-thread ownership of UIKit and SwiftUI. [Nitro view components](https://nitro.margelo.com/docs/guides/view-components)

Prefer a new small runtime over making mgcrea a production dependency. Reuse its licensed patterns where applicable, especially typed control construction, hosting lifecycle, and separating user changes from prop changes. Its virtual-tree approach is valuable prior art; this design requires native child ownership and Fabric commit coordination that must be proved independently.

**2. Transparent composition needs native tree boundaries**

Every `Swift.*` component should render a generated native host component into the existing React Native renderer. React remains responsible for reconciling application components, context, Suspense, keys, and effects. Fabric supplies the committed parent/child topology and typed prop changes. A Swift component must not register a native node during React render or independently publish an effect-built JSX tree.

This is essential for arbitrary user components. `React.Children` inspection cannot discover whether `<ProfileBody />` eventually renders `YStack`, `Swift.VStack`, a fragment, or a portal. React context also cannot identify an intervening unmodified RN `View`: that view does not reset a custom context. Fabric host ancestry is the place to discover the actual boundary. React's documented shadow tree contains host components rather than application function components. [React Native render pipeline](https://reactnative.dev/architecture/render-pipeline)

Proposed native ownership rules:

- Adjacent Swift host nodes belong to one SwiftUI tree and share a `UIHostingController`.
- The first ordinary RN subtree below a Swift node becomes an RN slot. Fabric retains ownership of its children and lifecycle; SwiftUI positions a package-owned slot container through `UIViewRepresentable`.
- A Swift node beneath that RN subtree starts a new SwiftUI host. Thus the example's `Swift.Toggle` belongs to a nested host within `YStack`, not to the surrounding glass card's SwiftUI stack.
- Preserve nonflattenable boundary anchors and mount/unmount relationships. Resolve children through component mounting, never through global numeric-tag lookup followed by arbitrary view reparenting.
- Maintain proper controller containment and environment propagation at each host. A SwiftUI appearance transition must not independently destroy a React-owned child.
- Identify nodes using surface identity plus Fabric node family and a mount generation. Recycled views receive fresh generation identity and release callbacks, hosting state, and slots.

The physical UIKit tree and Fabric layout tree diverge at these boundaries. Maintaining coordinates, view flattening rules, clipping, accessibility, and ownership is part of the Fabric layer. It cannot be solved solely by returning an existing `UIView` from `makeUIView`.

This is the first feasibility gate: inspect the pinned RN/Nitro extension points and implement only a host, stack, text, toggle, and RN slot. Establish whether supported component descriptors, shadow-node specialization, and mount hooks can express these rules. If an RN or Nitro change is needed, name and upstream that change before promising drop-in transparent composition. Do not patch internal view hierarchies with runtime swizzling.

Keep an explicit `Swift.RNView` available to express sizing and interaction policy. It should use exactly the same slot implementation as automatic boundaries. Automatic nesting is the intended product behavior; requiring developers to annotate every arbitrary composite is not proof that it works.

**3. Layout: proposals down, measurements up, one owner per axis**

The fundamental restriction is an acyclic size dependency. A parent cannot derive its height from a child that derives its height from that same parent's available height.

Represent boundary sizing per axis, with three meanings:

| Mode | Size owner | Rule |
| --- | --- | --- |
| Fixed | Caller | Pass the finite specified size through both engines. |
| Fill | Parent engine | Require a finite parent allocation; the child lays out inside it. |
| Content | Child engine | Measure content under the other axis's constraint and report the result upward. |

The common card case is finite/fill width and content height. A scrolling RN list needs a bounded viewport. `flex: 1` on the scrolling axis inside a content-sized boundary is invalid; diagnose it at the boundary rather than iterating frames until something appears.

For a fixed card of width `W` with horizontal padding `P`, SwiftUI proposes `W - 2P` to the slot. Yoga measures the immutable RN subtree at that width to obtain `H`. SwiftUI can then report `H + 2P` for the card. The host should express that returned measurement in Fabric state so surrounding Yoga siblings receive the correct height. A mere update to `UIView.frame` does not update those siblings.

Proposed implementation contract:

1. Associate layout inputs with a Fabric content revision, environment revision, and proposal. Distinguish exact, at-most, unspecified, and infinite proposals. Do not convert unspecified width into the window width or zero.
2. For an RN slot, measure a private layoutable snapshot under the proposal through the C++ adapter. Never mutate an already committed shadow tree. Keep the snapshot's layout result with the same revision as its measured size.
3. Execute SwiftUI measurement and all hosting-view access on the main thread. `UIViewRepresentable.sizeThatFits` must be a query over that measurement context. Avoid publishing geometry state or triggering React from inside the query.
4. Cache repeated proposals within a revision. Invalidate on content, fonts/Dynamic Type, locale, layout direction, scale, and environment changes. Retain only a bounded set of proposals per live boundary, not an accumulating global history.
5. Publish returned boundary sizes through immutable Fabric state. Install slot bounds and the matching RN descendant layout together. Repeated equal sizes do not create another state update; final output is pixel-rounded consistently.
6. Track placement as well as size. `measure`, `measureInWindow`, hit testing, accessibility frames, transforms, and scroll offsets must agree with where SwiftUI placed the slot.

**Threading is the unresolved part that must be prototyped.** Fabric may calculate layout off the UI thread. A Yoga measurement callback must not synchronously dispatch to main while main is waiting for a Fabric commit. A lock around SwiftUI does not solve this. UIKit measurement also cannot be moved onto a background thread simply because JSI is synchronous.

For the first prototype, support explicit bounded hosts and already allocated RN slots. Then prototype a native measurement-preparation phase that measures on main, publishes a revision-tagged result, and allows the corresponding Fabric transaction to complete. The selected mount integration must keep a host's prior complete geometry until the new size and descendant frames are ready. An asynchronous image load is a new input revision; it is not a reason to return a size from a different width's cache.

This proposal does not establish that arbitrary content-sized mixed trees can be committed in one display frame using current public hooks. If the preparation phase needs another Fabric commit, measure that latency explicitly. Ship intrinsic composition only after a trace demonstrates coherent presentation under resize; otherwise the initial scope must say bounded composition and identify the intrinsic-layout work still required. Do not advertise frame-perfect arbitrary sizing from a geometry callback plus `setState`.

Expo's current implementation reports geometry to shadow-node sizing and separately reports the content origin. It is useful prior art for both dimensions and coordinates. [Expo HostView implementation](https://raw.githubusercontent.com/expo/expo/main/packages/expo-ui/ios/HostView.swift)

Acceptable repeated work is bounded proposal evaluation for a revision, including SwiftUI's legitimate layout probes. Unacceptable repeated work is an idle stream of commits with unchanged inputs. A repeated dependency cycle should generate a diagnostic containing the boundary path and sizing modes.

Animations follow the same ownership rule: SwiftUI animates inside a stable host; Reanimated can animate the outer RN host. Animating a size across the boundary requires a coordinated native layout path. Do not let both engines animate the same frame independently. SwiftUI environment values also do not automatically become Tamagui tokens: explicitly bridge shared appearance/locale signals, and let Tamagui resolve its own typography and tokens.

**4. Touch, gesture, accessibility, and presentation integration**

Preserve UIKit hit testing through the representable. Decorative glass/background layers should not acquire a catch-all tap recognizer. Respect RN `pointerEvents`, clipping, transforms, disabled state, and SwiftUI hit-testing policy.

Within the normal RN surface, preserve the existing surface touch handler. Attaching another handler to every RN slot produces competing event streams. A sheet or popover that places content outside that surface needs a local event root and matching coordinate origin. Expo's RNHostView source explicitly distinguishes these cases and cleans up handlers when content disappears. [Expo RNHostView implementation](https://raw.githubusercontent.com/expo/expo/main/packages/expo-ui/ios/RNHostView.swift)

RNGH integration must operate on native gesture recognizers. Keep native-owned controls native; a Swift toggle emits a semantic change event, not a synthetic RN press. Provide an optional RNGH adapter at the slot/host boundary using the installed version's native-gesture integration. Gesture relations only work within the same RNGH root, so modal roots need deliberate setup. [RNGH root documentation](https://docs.swmansion.com/react-native-gesture-handler/docs/core-components/root-view/), [native gesture entry point](https://docs.swmansion.com/react-native-gesture-handler/docs/legacy-gestures/gesture/)

Start with passive Swift containers around interactive RN content and native controls inside RN layouts. Do not claim generic precedence between arbitrary SwiftUI `.gesture` modifiers and RNGH. SwiftUI-owned recognizers are not generally public handles that can be handed to RNGH. Cross-boundary competing pans require an explicit owner and a public-API implementation, with unsupported combinations rejected.

Use one scroll owner per axis by default. Same-axis nested scrolling, interactive sheet dismissal, swipe-to-go-back, context menus, and long-press competition require separate integration cases. Do not change private SwiftUI recognizer delegates.

Accessibility belongs in the first mixed-tree prototype. The slot container should not create a duplicate accessible element around its children. Validate VoiceOver traversal across both boundaries, focused-element retention after reorder, keyboard focus and dismissal, RN TextInput selection, and coordinate-based automation. A screenshot alone cannot verify any of these.

**5. React state and Swift Binding synchronization**

Keep familiar controlled props:

```tsx
<Swift.Toggle isOn={enabled} onToggle={setEnabled} />
```

Generate `Binding(get:set:)` over a stable native node model. Its setter changes a local interaction value immediately and queues a typed semantic event to JavaScript. The getter reads the interaction value while an edit is pending. React commits provide the authoritative accepted value. Prop application must never call the user-change callback.

Separate three identities: mount generation, React commit revision, and per-control native event sequence. An event envelope contains the node identity, event sequence, event name, and typed payload. Reject deliveries targeting a disposed generation. Compare sequences only within their documented domain.

The controlled adapter must carry an acknowledgement of the latest processed event through a React commit, even when the parent's controlled value stays unchanged. That case means rejection, and the native control must restore the supplied value. A wrapper that only forwards changed values cannot implement rejection reliably. The acknowledgement update must share the callback's React batching/priority behavior; capture it in committed adapter state, not in a mutable ref read from an interrupted render.

On native receipt: an acknowledgement older than the pending event cannot overwrite its interaction value. A matching/latest acknowledgement applies the React value, whether accepted or rejected. A newer user event supersedes an older acknowledgement. Add an explicit reset revision for programmatic overrides that must cancel pending interaction. Document that asynchronous validation should optimistically accept immediately and later send an explicit correction, or keep the control disabled until acceptance is possible.

This ordering protocol requires a runtime test under interrupted/concurrent React renders before the public binding API freezes. Nitro transport alone does not establish ordering between an imperative update and a Fabric mount.

Discrete toggle/button events are delivered once and in order. Continuous slider changes may coalesce intermediate notifications while preserving the final value and end-of-edit event. Native interaction and animation must remain responsive during a deliberately blocked JS thread. No Swift binding getter or layout query should synchronously ask JavaScript for a value.

Text editing needs selection, marked-text/IME composition, and event-count reconciliation. Start with toggle and slider; include TextField only after that protocol has been extended and tested. An uncontrolled `defaultIsOn` mode can keep value ownership entirely native; changing between controlled and uncontrolled mode should require an explicit remount.

Batch prop/child changes by Fabric transaction and invalidate each affected native node once. Keep stable node objects across ordinary prop changes and retain keyed child identity. Avoid full-tree JSON serialization for a single toggle, and avoid rebuilding an entire hosting controller to apply one property.

**6. Generator and flat-prop semantics**

Build an SDK inventory tool, a semantic mapping policy, and code emitters as distinct stages within one generator. SwiftSyntax supplies a source-accurate syntax tree and versions aligned with Swift tooling. It is not a type checker. [SwiftSyntax](https://github.com/swiftlang/swift-syntax)

The extraction pipeline should:

1. Record Xcode build, Swift compiler version, target triple, SDK version, and input hashes. Read public SwiftUI and SwiftUICore interfaces plus referenced public types as required. Respect conditional compilation and platform availability.
2. Parse declarations, extensions, argument labels, overloads, generic constraints, attributes, defaults, enum cases, actor isolation, and closure signatures. Exclude private, underscored, and SPI-only APIs.
3. Normalize into a deterministic schema containing symbol identity, supported overload, parameters, availability, child slots, binding/event roles, modifier receiver/result types, and preview support.
4. Apply explicit semantic mappings. Map finite primitives, strings, optional values, tagged enums, colors, lengths, alignments, shapes, and bounded collections. Lower `Binding<T>` to the controlled protocol. Lower supported `@ViewBuilder` closures to named children. Treat arbitrary closures, protocols with associated types, key paths, custom styles, resources, and generic overload families as requiring an adapter or an exclusion reason.
5. Emit TypeScript component types, Nitro-compatible transport types, native factories, modifier dispatch, documentation, and a coverage report from the same schema. Preserve a distinction between omitted/reset, null, and explicit values.
6. Compile generated Swift against the pinned SDK and TypeScript usage fixtures against public exports. Compiler diagnostics are the authority on overload resolution and constraints. Run deterministic regeneration in CI and review SDK diffs before adding new coverage.

Do not execute Swift expressions copied from default arguments in JavaScript. Omit the Swift argument when the selected initializer permits it, or encode a deliberately mapped default. Do not turn unknown types into `any` and count them as supported APIs.

Generation cannot discover that a `List` needs lazy item materialization, that a picker requires tags, or that a sheet needs controller ownership. These need authored semantic adapters. A `LazyVStack` around an eagerly reconciled React array does not virtualize that array. Large lists need an explicit item/data contract and a decision about whether RN or SwiftUI owns virtualization.

The native registry dispatches to compiled Swift code. It does not invoke Swift generic functions by their string names. Use generated concrete constructors and adapters, applying receiver-specific modifiers before type erasure. Use `AnyView` at deliberate heterogeneous boundaries, with stable node identity; quantify its update and allocation cost in realistic trees. New SDK APIs require regeneration and a new native build. JavaScript updates cannot introduce new compiled native implementations.

For flat props, define one versioned lowering order. A workable initial contract is: construct content and receiver-specific options, environment defaults, padding, frame constraints, background/material, clip shape, glass treatment with an explicit shape, overlay/border, shadow, transforms/opacity, interaction/accessibility attachments. Finalize the exact sequence with visual fixtures; it is a One convention. Both native and preview consume the resulting ordered operations.

Keep Yoga style separate from Swift modifiers: `style` controls the outer RN boundary, while flat Swift props describe the SwiftUI content. For nested Swift nodes, reject outer Yoga style rather than silently interpreting it as Swift layout. Tamagui tokens resolve to typed values through the optional adapter; preserve dynamic platform colors instead of prematurely converting them to static hex strings.

Provide `chain` as an alternative to flat modifier props, enforced as mutually exclusive in TypeScript and native validation. It replaces the generated order; it does not ambiguously append duplicates. Structural props and event handlers remain usable with either form. Validate receiver-specific operations and OS availability in the chain too.

`GlassCard` should be a small authored recipe over generated primitives. `material="ultraThin"` requests a material background. `glassEffect="regular"` requests Liquid Glass. Define whether their combination is legal; do not imply they are aliases.

**7. Browser and future Android**

Reuse the normalized component/modifier schema for a preview adapter. The preview executes JavaScript state and renders a supported semantic subset. It does not run arbitrary Swift or derive Apple's renderer implementation from `.swiftinterface` files.

Start with stacks, fixed/content sizing, simple text, colors, padding, radius, material/glass approximations, buttons, and toggles. Mark each feature as native-equivalent behavior, visual approximation, or unsupported. Keep real input/accessibility support through the preview host's existing facilities; a shader cannot provide keyboard editing or accessibility by itself.

Use the existing rnx rendering and hit-testing paths after inspecting them. Do not create a second Yoga implementation inside this package. Measure cold and warm incremental download, retained memory, shader compilation, and interaction cost. Exact SF Symbol, font, accessibility, blur, and glass behavior cannot be assumed from shared JSX.

For Android, share node identity, lifecycle, event envelopes, normalized value conventions, and generator infrastructure. Build a separate Compose adapter and semantic mapping layer, with AndroidView/ComposeView boundaries and independent measurement/gesture validation. Swift generics and Apple view concepts do not translate mechanically to Compose. Reserve a separate `Compose` or `Kotlin` namespace until the API is designed; do not make `Swift.*` silently mean a different native widget on Android.

Navigation is a later, separately owned integration. Native adaptation depends on actual controllers, size classes, and OS behavior. It does not follow automatically from exposing a `TabView` symbol in TypeScript. Avoid a second navigation state machine beside One/React Navigation.

**8. Concrete implementation sequence and delivery gates**

| Stage | Deliverable | Required evidence |
| --- | --- | --- |
| 0. Resolve integration seams | Pin RN/Nitro/Xcode; document custom shadow-node and mount APIs; record an API/layout decision | Tiny native build showing child mount interception and a slot without ownership violations |
| 1. Mixed bounded prototype | One host, VStack, Text, Toggle, RN slot; exact four-level sample with finite bounds | Mounted-app assertions, real taps, key reorder/unmount, RN context retention, Swift control update, correct measured coordinates |
| 2. Intrinsic sizing | Width-constrained RN content, host sizing, native revision protocol | Resize/Dynamic Type/image-load traces; no mismatched parent/child frame revision and no recurring idle commits |
| 3. Interaction and binding | Event acknowledgement, rejection/reset, gesture adapter, accessibility | Rapid toggle/rejection and JS-stall probes; RN press cancellation/scroll; VoiceOver and keyboard checks |
| 4. Generated subset | Generate the proven components plus roughly 15–25 common modifiers | Regeneration reproducibility, native compilation, meaningful behavior fixtures and unsupported-symbol report |
| 5. One/Tamagui dogfood | Settings/form/card screen and a reused RN content component | Physical-device checks, HMR state behavior, theme changes, rotation and background/foreground lifecycle |
| 6. Preview adapter | Same supported examples in rnx/Contrast | Native/reference comparisons, interaction parity, explicit approximation labels and measured payload delta |
| 7. Package candidate | Native autolinking, distribution, docs, version compatibility | Install packed local artifact in a clean consumer and build/run it; explicit owner approval before npm release |

Stages 1–3 should precede broad generation. The first task should be the bounded mixed-tree prototype and its Fabric integration, not scraping the entire SDK. Stage 2 is the main schedule risk; no calendar promise is defensible until the thread/mount seam is proven.

Keep one integration app with focused scenarios rather than a test file per generated component. Vary width, text length, key order, event timing, and mounted generation so each check can fail. Include negative controls: reject a proposed toggle value, deliver an old event after recycle, abort a React render, and request a circular content/fill layout. A check that only verifies a generated symbol exists does not establish behavior.

For performance, compare the same screen with pure RN, pure SwiftUI, and mixed trees on the same device. Collect commit-to-visible latency, frame times at the device refresh rate, boundary count, layout queries per input revision, native allocations, JS/native bytes, and retained memory after repeated unmount. Require zero continued layout commits at idle and zero surviving node registrations after teardown. Measure realistic forms and a bounded list viewport; do not extrapolate from a single glass card.

When this becomes implementation work, create its long-lived branch under `~/.worktrees/one-<slug>` from fresh `origin/main`. Use the repository's local consumer flow for dogfooding. Builds and package candidates can proceed locally; npm publication needs the owner's direct approval.
