# handoff: One Native parity expansion

date: 2026-09-11
branch: `feat/one-native`
worktree: `/Users/n8/.worktrees/one-native`
tip: `bfb15b5ff`
production: unpublished package; no release authorized

This file is the current-state snapshot. Every number in it was produced by running the
command beside it, not recalled. Re-run before trusting it. The SwiftUI gap analysis lives in
`one-native-swiftui-gap.md`; this file does not restate it.

Keep the difficult runtime and schema integration work in-house and use a small squad for
bounded catalog, fixture and conformance work. Every worker goes through `tm run`.

## What landed

- Exact SDK constructor signatures, generic modifier requirements, both Swift
  availability syntaxes, and normalized escaped identifiers. Ambiguity is an
  error. `codegen/Extract.swift`, `inventory.ts`, `generate.ts` own this pipeline.
- The package floor is iOS 26. `MINIMUM_IOS` in `codegen/generate.ts` is the only place it is set;
  `schema.json` carries it forward and `OneNative.podspec` reads it from there. Raising it deleted
  every `@available` and `if #available` branch from the generated Swift, and it is what makes
  `WebView` an ordinary leaf instead of a design problem.
- Generated Swift is typechecked against the simulator SDK at an iOS 26 target.
  `generate:check` checks exact outputs and SDK provenance. CI pins Xcode 26.4
  and compiles the real native-features consumer, including ObjC++/Fabric code.
- `ios/OneNativeControlled.swift` and `src/controlled.ts` share optimistic native
  values, event counts, acknowledgements, and reset revisions. Tabs, menu toggle
  sources, all six controls, and sheet presentation use the protocol. Unchanged
  incoming props do not publish new SwiftUI state.
- `ios/OneNativeSlot.swift` owns RN slots with fill, passive, and presented modes.
  `cpp/OneNativeSlotShadowNode.h` shares native size/origin state and descriptors.
  Presented content has a local zero origin and its own Fabric touch handler.
- `Picker`, `DatePicker`, `ColorPicker`, `Toggle`, `Slider`, `Stepper`, `Text`,
  `Label`, `Button`, `ProgressView`, `Gauge`, `TextField`, `SecureField`, `Alert`, and
  `ConfirmationDialog` come from `codegen/{picker,form,leaf,text,presentation}Catalog.ts`
  through `emitControls.ts`. Native hosts, ObjC++ adapters, TS types, Fabric specs,
  enum validation, the non-iOS throwing stubs, and schema are generated.
- The control emitter covers three shapes, with no per-control branches: a
  controlled value, numbered action events that may carry payload fields, and
  read-only display. `height: 'presentation'` emits a zero-size host that dismisses
  its presented view controller on recycle. Object-array props are generic: a field
  declares `payload: { name, element }` and gets a shared Swift struct in
  `ios/Generated/OneNativePayloads.swift`, a dirty-flagged ObjC++ diff, and a public
  TS type. `PickerOption` is one instance of that mechanism, not a special case.
- `Sheet` uses a real SwiftUI `.sheet`: controlled presentation, nested RN
  content, medium/large/fraction/height detents, drag indicator, dismissal blocking,
  and `onDismiss`. `codegen/emitSheet.ts`, `ios/OneNativeSheetView.swift`,
  `ios/OneNativeSheetComponentView.mm`, and `src/Sheet.native.tsx` are the sources.
- `schema.json` is exported for Soot. Pure native content travels as data props;
  RN subtrees use Fabric children. Menu parentId flattening exists because RN
  codegen cannot express recursively nested object arrays.
- Recycled hosts retain Fabric `_props` so superclass diffs reset actual UIView
  accessibility/visual state. Only our menu items, picker options, and sheet detents
  caches are marked dirty when models reset. The runner leaves/reenters the menu
  route twice and asserts the native trigger and first page remain accessible.
- The generator reads every SwiftUI overlay module, all 23 `_<Framework>_SwiftUI` frameworks,
  not just SwiftUI and SwiftUICore. That took the inventory from 9,715 to 11,212 declarations and
  is what makes `VideoPlayer` (`_AVKit_SwiftUI`), `QuickLook` (`_QuickLook_SwiftUI`) and `Map`
  (`_MapKit_SwiftUI`) reachable. The evidence is not the declaration count: all three overlays
  appear in the test dylib's load commands, so they are live at runtime.
- `layout: 'fill'` joined `measured` and `presentation`. A fill control reports no ideal height
  and takes the box React Native gave it, which is what `VideoPlayer` and `Map` need. Asserted by
  number in the suites (373 by 220, following the style to 320 and back).
- Visual verification. The accessibility assertions cannot see whether anything painted, so a
  control publishing a correct tree with correct frames while rendering nothing passed all 386.
  `scripts/visual-*.ts` closes that with 18 checks over declared crop regions. No baseline images
  are committed and none will be: each check stores a region, a pixel measurement, a floor, and
  its calibration. `tests/native-features/scripts/README.md` documents the three enforced
  properties and why the Gemini oracle is advisory rather than gating.

Read `one-native-opus-review.md` and `one-native-foundation-review.md` for the two
already assigned reviews and dispositions. Do not re-review the same foundation
or ask every control worker to commission another review. The next new runtime
boundary merits one assembled review.

## Runtime and commands

Simulator: `36CB8903-C59C-4438-BA29-E7A3C8876C37`, iPhone 16, iOS 26.4, 393x852.
Xcode 26.4 (17E192). Local ignored app bundle: `dev.one.native.tests`.

The ignored existing native project is `tests/native-features/ios/OneNativeTests.xcworkspace`,
scheme `OneNativeTests`. A fresh prebuild uses the checked-in app config's
`NativeFeatureTests` name and `dev.vxrn.native.tests` bundle instead. Do not confuse
those names when installing or running automation.

```sh
cd /Users/n8/.worktrees/one-native/packages/one-native
bun run generate:check
bun run typecheck
bun run test
bun run build

cd /Users/n8/.worktrees/one-native/tests/native-features
bun run dev --port 8107

xcodebuildmcp simulator build-and-run \
  --workspace-path /Users/n8/.worktrees/one-native/tests/native-features/ios/OneNativeTests.xcworkspace \
  --scheme OneNativeTests \
  --simulator-id 36CB8903-C59C-4438-BA29-E7A3C8876C37 \
  --derived-data-path /tmp/one-native-derived --configuration Debug

bun scripts/one-native-conformance.ts \
  --simulator-id 36CB8903-C59C-4438-BA29-E7A3C8876C37 \
  --bundle-id dev.one.native.tests --suite sheets \
  --artifact-dir /tmp/one-native-final-sheets
```

Or run everything, all twelve suites then the visual pass, with one command:

```sh
bun scripts/one-native-conformance-all.ts \
  --simulator-id 36CB8903-C59C-4438-BA29-E7A3C8876C37 \
  --bundle-id dev.one.native.tests --artifact-dir /tmp/one-native-conformance
```

The visual pass runs last and against the artifact root rather than per suite, because several
checks take their negative capture from another suite's directory.

Suites are `tabs-menu`, `pickers`, `forms`, `sheets`, `leaves`, `dialogs`, `host`,
`containers`, `popover`, `accessibility`, `media`, `map`. Each stops
and relaunches the app and asserts loaded state. Do not run concurrent simulator
operators. Do not edit application sources while testing state retention; HMR
invalidates that test. `pod install` runs inside `tests/native-features/ios` after
Fabric spec changes. Swift-only changes need a native rebuild, not new pods.

The dev server is already running on 8107 at handoff. Its log is
`/tmp/one-native-expansion-dev.log`; find its exact listener PID with
`lsof -nP -iTCP:8107 -sTCP:LISTEN` when taking ownership. Do not start a duplicate.
Its ignored AppDelegate points at that port. No probe instrumentation remains.

## Things the runtime probes established

- Segmented selection accepts/rejects; a rejected Gamma visibly restores Beta.
  External selection and reset work. Menu/wheel selection work; standalone inline
  uses a wheel outside a native Form, so it needs the same 216-point allocation.
- Compact, graphical, and wheel date selection produce the expected epoch-backed
  `Date` value. The fixture uses September 2026 and English simulator settings.
- Color selection produces `#000000FF` for opaque black with opacity enabled.
- Toggle accepts/rejects and resets its actual native state. Stepper rejects and
  restores the native value. Slider drag and external prop changes work.
- Sheet RN buttons/input work. Count and input survive close/reopen, nesting, and
  detent changes. Height 300 reports an actual `393x300` Yoga layout. The same
  native drag is blocked with interactive dismissal disabled and dismisses with
  it enabled, updating React and the dismiss callback.

- Native layout measurement (stage 1 probe of `plans/one-native-layout-design.md`,
  probe removed after the run). A container must write only the measured HEIGHT into
  Fabric state: pinning both axes through `setSize` makes it ignore the width its
  parent gives it. `UIHostingController.sizeThatFits(in:)` at the Yoga width is the
  mechanism; `intrinsicContentSize` ignores the proposed width and answers a different
  question. The returned WIDTH is SwiftUI's ideal, smaller than the proposal, so only
  the height is usable. `Form` has no intrinsic height at all: proposed infinity it
  returns 0, proposed 10,000 it returns 10,000, at every row count and width, while
  `VStack` and `Text` agree under both proposals. A state write from `layoutSubviews`
  reaches Yoga in the SAME display frame, and the measure/layout loop terminates
  (frozen at 38 measures / 15 layouts / 7 writes over five idle seconds). Measuring in
  the same turn as the model write returns the PREVIOUS content's height, so measure
  from `layoutSubviews`. And by negative control, with every explicit schedule removed
  `layoutSubviews` ran exactly once: SwiftUI content changes do not invalidate the
  Fabric host's layout, so a host that measures from UIKit must schedule its own
  remeasure. `Swift.Host` measures from SwiftUI (`onGeometryChange` under
  `fixedSize(vertical: true)`) and sidesteps this entirely.

- Native composition (`Swift.Host`). A composed control never joins the view hierarchy
  and never gets a window, so it activates when the host publishes it. Measured heights
  at a 361-point width: one Toggle 28, plus a Button and a Stepper 84, with 20-point
  spacing 124, with a wrapping Toggle label 107. All three composed control kinds emit
  and React accepts the value, and the native Stepper's AXValue follows React. A
  composed child's React Native view props (testID, accessibility, background, layout
  height) land on a UIView nobody displays; SwiftUI supplies the accessibility element
  instead. Horizontal hosts overflow when their children are width-greedy: three
  controls side by side report 128 points for 50 points of content, while one child
  measures exactly 28. Composition survives two leave/reenter recycling cycles.
- Containers (`Swift.Form`, `Swift.Section`). One `OneNativeContainerView` owns the
  children, the publication into SwiftUI, and the standalone hosting controller; a
  host, a form and a section differ only in the SwiftUI container they wrap the
  published children in. Containers are composable themselves, so `Form > Section >
  Toggle` and a host inside a section both work, a Toggle two containers deep emits,
  and its native AXValue follows React. A section mounted later, a section prop change,
  and a section unmount all reach SwiftUI through the published tree. A `Form` fills
  its Yoga box (508 points in the fixture) because it has no ideal height; composed
  into a measured host it reports 0 and renders nothing, so `Swift.Host` rejects a
  `Swift.Form` child in JavaScript.
- React Native inside a container (`Swift.Slot`). A slot reuses `OneNativeSlot` and the
  shared slot shadow node: SwiftUI proposes the box from an explicit `height`, the state
  writes it back to Yoga, and the React subtree lays out inside it. A slot row in a
  Section and a second one in a Host composed into a later Section both render in order
  and take taps. Three things the runtime settled: the slot's origin is local, as it is
  for presented sheet content, and the origin is not what routes touches on iOS; an
  HStack offers a representable no width, so a slot in a horizontal host takes an
  explicit `width`; and the slot view must leave the SwiftUI tree in `decompose`,
  because React Native recycles it in the transaction that unmounts it and asserts it
  has no superview, while SwiftUI dismantles the representable later.
- Popovers (`Swift.Popover`). A popover is a measured container whose children are the
  trigger and whose `content` is a presented React Native subtree, so it is the
  composition contract and the sheet's presented slot put together, with no mechanism of
  its own. The trigger measures 24 points for one Button and lays out inline; the
  presented subtree takes taps and dismisses itself; a tap outside reaches React through
  the controlled protocol, proven by presenting it again afterwards, which a lost event
  would make a no-op. The anchor is the trigger's own bounds, so the trigger stack hugs
  its content and an outer frame puts it at the leading edge. SwiftUI sizes a popover
  from its content, so `contentWidth` and `contentHeight` are required. A popover
  composed into a Section works, and the default compact adaptation presents its body as
  a full-height sheet on an iPhone.

Automation details that prevent false diagnoses:

- Fabric normalizes transport event names globally. Use `onNative...`, never a
  generic `onChange` (direct/bubbling collision), and never `onOneNative...`
  (`oneNative` starts with `on`, which Fabric strips a second time).
- Swift keywords have source backticks but plain JS strings: `switch`, not
  a string containing backticks. The extractor normalizes identifiers.
- The CLI's instantaneous HID tap does not start iOS 26 switch tracking. Use a
  150 ms press on the switch. A temporary probe confirmed hit-testing/targets,
  and disabling RN's recognizer did not fix instantaneous taps. No native gesture
  workaround was added. Press acceptance/rejection remains strictly asserted.
- Stepper increment reports enabled through this snapshot API even at its upper
  bound. The runner proves a boundary tap does not change the value and that
  decrement still works. Do not substitute the misleading AX enabled flag.
- Native segmented tabs/calendar cells/color popup children are missing from this
  snapshot API. Calibrated coordinates are guarded by observed bounds/device size;
  screenshots and exact post-interaction values provide the remaining evidence.
- `tap` takes integer `-x`/`-y`; `swipe` uses `--x1`/`--y1` etc. Snapshot output is
  fenced JSON. AX values can be numbers or strings. Some RN Text testIDs disappear
  in the accessibility snapshot; Pressable/TextInput IDs are present.
- Never reset Fabric `_props` without resetting the corresponding UIView state.
  RCTViewComponentView intentionally retains them across recycling. Clearing them
  left a formerly inactive tab page visually present but hidden from accessibility.
  Content cache invalidation uses separate dirty flags and does not change base props.
- Development warning overlays can cover the last home route as well as the tab
  bar. The runner waits for its animated bounds to settle, dismisses the observed
  overlay, and asserts it disappeared before
  either interaction. A tap on the warning opens DevTools instead of the route.
- Stopping console log capture can terminate the app that capture launched. Do not
  run subsequent input against the simulator home screen accidentally.

## Final verification receipts

- `bun run test`: 19 tests, 64 assertions, pass.
- `bun run typecheck` and `bun run build` pass.
- `generate:check`: `SwiftUI SDK 26.4: 11212 declarations, 131 mapped symbols, 127 generated
  files, verified`; assembled Swift compiles and the controlled-state probe passes acceptance,
  rejection, stale acknowledgments, reset and mixed sources.
- Conformance end to end: 393 accessibility checks across twelve suites plus 18/18 visual
  checks, exit 0. Per suite: tabs-menu 59, pickers 29, forms 31, sheets 35, leaves 76,
  dialogs 32, host 27, containers 29, popover 26, accessibility 21, media 15, map 13.
- Consumer Debug build: `/tmp/one-native-final-build.log`.
- Arm64 simulator Release pod build: `/tmp/one-native-final-release.log`.
- Each final runtime suite writes `/tmp/one-native-final-<suite>/outcome.json`
  and `/tmp/one-native-final-<suite>.log`, where suites are `pickers`, `forms`,
  `sheets`, and `tabs-menu`. Screenshots live alongside those outcomes. The later
  suites (`leaves`, `dialogs`, `host`, `containers`, `popover`) write to
  `/tmp/one-native-conformance/<suite>` instead.
- JS measurement: `/tmp/one-native-final-measure.json`; native sections:
  `/tmp/one-native-final-native-size.json`; package: `/tmp/one-native-final-pack.json`.
  The coverage plan records values and limitations.

## Next work

Ranked. `one-native-swiftui-gap.md` carries the evidence for this ordering.

1. **A styling surface.** There is none. Grep the catalogs for `font`, `tint`,
   `foregroundStyle`, `padding`, `frame`, `background`: none exist, so every control renders at
   system defaults and no `tint` means a whole app is stuck on system blue. `style` reaches the
   Fabric UIView behind the SwiftUI content, not the content. Unbound by family: decoration and
   effects 54, box and layout 28, text appearance 33, colour 7. This is the only item that
   changes what the existing 29 bindings can do rather than adding a 30th, and the mechanism
   exists: one `swiftStyle` object payload prop applied by a single generated
   `.oneNativeStyle(model.style)` helper, every field selected from the SDK for provenance the
   way `methods` entries already are.
2. **Standalone `Image` with SF Symbols.** Symbols are reachable today only through `Label` and
   the `systemImage` prop on `Button`, so there are no symbol effects, rendering modes, or
   variable values. Small and self-contained.
3. **Focus and `keyboardType`.** All 11 focus modifiers unbound, and `keyboardType` with them.
   No programmatic focus, no next-field chain, no numeric keyboard. For form controls this is a
   functional blocker, not polish; `textCatalog.ts` already admits it in a comment. Drive
   `FocusState` from a `focused` prop plus an `onFocusChange` event over the existing controlled
   protocol.
4. **Environment propagation** on `Host` and `Form`: `colorScheme`, `dynamicTypeSize`, `locale`,
   `tint`, `isEnabled` set once per screen and inherited, instead of per control. 148
   `EnvironmentValues` keys are currently neither readable nor writable.
5. **`PhotosPicker`, `ShareLink`, `fullScreenCover`, `contextMenu`, `ContentUnavailableView`.**
   All reachable with mechanisms that already exist.
6. **`WebView`** (`_WebKit_SwiftUI`), now that the floor is iOS 26. An ordinary leaf, no new
   mechanism.
7. Sheet sizing-to-content, selected detent binding, and presentation
   background/interaction/sizing remain unimplemented, as do the `presenting:`
   value-bound alert overloads. `presentationCompactAdaptation` landed with Popover.

One item wants a decision before code:

- **Navigation** wants a design pass before code. `NavigationStack`, `NavigationLink`,
  `navigationDestination`, `navigationTitle`, `toolbar` and its ten companions, `searchable` and
  its seven: 22 navigation modifiers at zero. Binding it means owning the interaction with
  whatever router the app already uses.

2. The layout wave is finished: controls compose into one SwiftUI tree, a host reports
   the height SwiftUI measured back to Yoga, `Text` and `Label` are generated leaves,
   `Swift.Form`/`Swift.Section` are containers that nest, `Swift.Slot` carries a React
   Native subtree into any of them, and `Swift.Popover` is a composed trigger with a
   presented body. Design reviewed once (r26161);
   `plans/one-native-layout-design.md` carries the measurement contract, the review, and
   what each stage changed against the plan. What it leaves open: a composed child's
   inherited `ViewProps` land on a UIView nobody displays, which the catalog should
   eventually map or reject.
3. Connect Soot to `schema.json`. A read-only worker traced the seam: Soot
   intercepts by NATIVE VIEW NAME, not npm specifier.
   `registerNativeComponentImplementation(viewName, component)` fills a global map
   that both `requireNativeComponent` and `codegenNativeComponent` consult first
   (`~/soot/packages/sootsim-engine/src/react-native/index.ts`). `@vxrn/native` is
   only a boot-time loader key in `~/soot/packages/compat/src/native-seam-loaders.ts`;
   a register module is side-effect-only. So a Soot seam implements
   `OneNativePicker`, `OneNativeAlert` and the rest, and our public adapters in
   `src/generated/Controls.native.tsx` run unchanged on top, keeping validation, the
   controlled protocol, and the default height. Seams emit RN-shaped
   `onX({ nativeEvent: payload })`, which matches `eventDelivery` in the schema.
   No schema/manifest reader exists in Soot today; every seam there is hand-written.
   The schema's honest gaps for an independent implementation are accessibility role
   and label mapping, an executable definition of the slot `layout` values, and any
   imperative ref/command/`setNativeProps`/measurement contract.
4. Migrate @vxrn/native by caller behavior, not export-name similarity. Color tokens,
   StackToolbar/ToolbarHost header ownership, SplitView, and ZoomTransition are One/
   react-native-screens integration. SwiftUI NavigationStack/Toolbar are not their
   drop-in replacements. `one-native-coverage.md` records the actual remaining work.
   A read-only worker inventoried the real callers: almost everything is test
   fixtures under `tests/native-features/app/*` (color-test, toolbar-test, menu-test,
   split-view-test, zoom-test, zoom-detail), the docs page
   `apps/onestack.dev/data/docs/native-features.mdx`, one Soot fixture using
   `StackToolbar` (`~/soot/packages/sootsim-engine/src/test-fixtures/VxrnNativeToolbarTest.tsx`),
   and a side-effect import in `~/soot/packages/contrast-native/src/index.ts`.
   `ToolbarHost`, `ToolbarItem`, `ZoomTransitionAlignmentRectDetector`, and every type
   export have zero direct callers. Migration cost is therefore mostly behavior
   preservation for Color, StackToolbar, SplitView, and ZoomTransition, not a wide
   call-site sweep.

## Measurement and delivery

`bun packages/one-native/codegen/measure.ts` reports minified/gzip JS and Bun-side
menu flattening. `npm pack --dry-run --json --ignore-scripts` reports distribution
size. Release native size comes from the arm64 archive under
`tests/native-features/ios/build/Pods.build/Release-iphonesimulator/OneNative.build/Objects-normal/arm64/Binary/libOneNative.a`.
The Pod project uses its own SYMROOT. Archive metadata is not installed app growth;
Bun timings are not Hermes performance or UI frame rates. The package uses Fabric,
not Nitro. No measured need for a second codegen/runtime dependency has emerged.

Main added the original research proposal as `plans/one-native-architecture.md`
after this branch had already added its implementation notes there. Its older Nitro
peer recommendation predates the assigned Opus review. Preserve the newer tested
Fabric decision if that document needs reconciliation when landing the branch.

The current CI workflow runs on selected push branches including main, plus manual
dispatch. Pushing this feature branch alone does not run native CI. Local native
consumer compilation and runtime receipts are the evidence for this handoff.

Own this worktree and ongoing task after accepting the handoff. Keep the primary
checkout on main. Commit and push coherent validated work to the feature branch;
no npm publish, release tag, or release workflow is authorized. Stop completed
workers. All workers from the initial expansion have been stopped.
