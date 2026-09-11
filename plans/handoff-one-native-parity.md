# handoff: One Native parity expansion

date: 2026-09-10 (Hawaii)
branch: `feat/one-native`
worktree: `/Users/n8/.worktrees/one-native`
last earlier commit: `3dcfe61d2` (generated SwiftUI menus and tabs)
main observed during final checks: `afe3ad6b0` (not merged into this tested feature tip)
production: unpublished package; no release authorized

Continue implementation after this expansion commit. Nate explicitly requested
Opus at extra-high to take over coordination after three or four substantial
areas work, with Grok and AGY doing most implementation. The completed areas are
picker varieties, form controls, and sheets. Keep doing the difficult integration
work yourself and use a small squad for bounded catalog/fixture work.

## What landed

- Exact SDK constructor signatures, generic modifier requirements, both Swift
  availability syntaxes, and normalized escaped identifiers. Ambiguity is an
  error. `codegen/Extract.swift`, `inventory.ts`, `generate.ts` own this pipeline.
- Generated Swift is typechecked against the simulator SDK at an iOS 18 target.
  `generate:check` checks exact outputs and SDK provenance. CI pins Xcode 26.4
  and compiles the real native-features consumer, including ObjC++/Fabric code.
- `ios/OneNativeControlled.swift` and `src/controlled.ts` share optimistic native
  values, event counts, acknowledgements, and reset revisions. Tabs, menu toggle
  sources, all six controls, and sheet presentation use the protocol. Unchanged
  incoming props do not publish new SwiftUI state.
- `ios/OneNativeSlot.swift` owns RN slots with fill, passive, and presented modes.
  `cpp/OneNativeSlotShadowNode.h` shares native size/origin state and descriptors.
  Presented content has a local zero origin and its own Fabric touch handler.
- `Picker`, `DatePicker`, `ColorPicker`, `Toggle`, `Slider`, and `Stepper` come from
  `codegen/{pickerCatalog,formCatalog,emitControls}.ts`. Native hosts, ObjC++
  adapters, TS types, Fabric specs, enum validation, and schema are generated.
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

Run each suite separately: `tabs-menu`, `pickers`, `forms`, `sheets`. Each stops
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

- `bun run test`: 19 tests in two existing package test files pass.
- `bun run typecheck` and `bun run build` pass.
- `generate:check`: SDK 26.4, 9,715 declarations, 61 mapped symbols, 42 generated
  files; assembled Swift compiles and controlled-state probes pass.
- Consumer Debug build: `/tmp/one-native-final-build.log`.
- Arm64 simulator Release pod build: `/tmp/one-native-final-release.log`.
- Each final runtime suite writes `/tmp/one-native-final-<suite>/outcome.json`
  and `/tmp/one-native-final-<suite>.log`, where suites are `pickers`, `forms`,
  `sheets`, and `tabs-menu`. Screenshots live alongside those outcomes.
- JS measurement: `/tmp/one-native-final-measure.json`; native sections:
  `/tmp/one-native-final-native-size.json`; package: `/tmp/one-native-final-pack.json`.
  The coverage plan records values and limitations.

## Next work

1. Expand the leaf catalog with Button, ProgressView, Gauge, and text input.
   Start at `codegen/controlTypes.ts` and `emitControls.ts`: the current template
   assumes a controlled value, so stateless/read-only leaves need an explicit
   catalog shape rather than dummy bindings. Keep SDK selection exact and compile
   each assembled result. Give Grok/AGY one named family with its fixture and
   validation commands, and keep shared emitter changes with one owner.
2. Add Popover, Alert, and ConfirmationDialog using the presentation protocol and
   existing slot policy. Sheet sizing-to-content, selected detent binding,
   presentation background/interaction/sizing remain unimplemented. Extend
   `emitSheet.ts` or factor only the bridge code actually shared by a second host.
   Prove RN touch coordinates, dismissal, and recycling in the existing runner.
3. Add real native layout/content composition (Host, VStack/HStack, Text/Label,
   Form/Section, explicit RN slot). Leaf heights are currently bounded JS layout;
   intrinsic content measurement is not implemented. This is the next difficult
   layout boundary, and should get an assembled design review before broad fanout.
4. Connect Soot to `schema.json`. Its existing component-name seam can intercept
   Fabric components. Generate prop/event types from the schema and use these same
   fixture behaviors as conformance cases. The browser implementations do not yet
   exist. Read `~/soot/packages/compat/src/stubs/native-seams/vxrn-native.tsx` before
   adding a parallel mechanism. No zero-payload or performance parity claim is proven.
5. Migrate @vxrn/native by caller behavior, not export-name similarity. Color tokens,
   StackToolbar/ToolbarHost header ownership, SplitView, and ZoomTransition are One/
   react-native-screens integration. SwiftUI NavigationStack/Toolbar are not their
   drop-in replacements. `one-native-coverage.md` records the actual remaining work.

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
