# One Native expansion

Expand the generated SwiftUI layer through tested component families, then hand
coordination to Opus with Grok and AGY owning most implementation. Review the
architecture for simplicity before choosing the next runtime boundaries.

## Accepted architecture review

The Opus review is recorded in `one-native-opus-review.md`. Before expanding:

- Match SDK constructors by full parameter labels/types and fail on ambiguity.
- Parse both Swift availability forms and typecheck generated Swift at iOS 18.
- Emit a normalized component/props/events/slots schema for Soot.
- Share the RN slot implementation with explicit allocation/interaction policy.
- Share optimistic controlled values, numbered events, acknowledgements and reset revisions.
- Compare menu payloads before Objective-C allocation; make conversion reusable.
- Use Fabric children for RN subtrees and data props for pure SwiftUI content.

SDK inspection corrected one review example: `Section(content:header:)` with
`header: () -> Parent` is the iOS 13 View initializer. The iOS 16 `() -> H`
overload belongs to TableRowContent. Exact matching retains the View initializer;
parameter-label-only matching remains ambiguous and is removed.

Keep unsupported-platform rendering explicit until a real preview implementation
exists. Keep validation at public boundaries; do not silently replace invalid
selection or unsupported styles. General content measurement and arbitrary
modifier chains remain separate work. Fixed-detent sheets do not require a
content-sized layout engine.

## Coverage target

The comparison inventory read `@vxrn/native` 1.26.0 in this checkout and official
Expo UI source reporting 58.0.0. Expo's SwiftUI export list was last changed by
`5ad6930946f1` when inspected. The SDK 57 documentation and Expo main differ; this
matrix uses the source inventory, not a claim of exact SDK 57 parity.

[Expo SwiftUI exports](https://github.com/expo/expo/blob/5ad6930946f1/packages/expo-ui/src/swift-ui/index.tsx)

| Family | Current implementation | Expansion target |
| --- | --- | --- |
| Menus | nested menus, sections, dividers, buttons, toggles, control groups, palettes | primary actions, context menu previews, pickers in menu content |
| Tabs | keyed RN pages, controlled selection, search role, adaptive sidebar, minimization | page style, sections, accessories, customization |
| Pickers | standalone Picker, DatePicker, ColorPicker with flat props. Picker styles `automatic`, `menu`, `segmented`, `wheel`, `inline` (`navigationLink` and `palette` rejected, they need a native container context). DatePicker `Date` selection/range, `displayedComponents`, and `automatic`/`compact`/`graphical`/`wheel` styles. ColorPicker `#RRGGBB`/`#RRGGBBAA` and `supportsOpacity` | pickers in menu content |
| Form controls | standalone Toggle, Slider, Stepper with flat props, plus the existing menu buttons/toggles. Toggle styles `automatic`, `button`, and `switch`. Slider/Stepper bounded numeric value, min, max, and step | pickers in menu content |
| Leaves and text input | standalone Button (`buttonRole`, `buttonStyle`, SF Symbol label), ProgressView (determinate and indeterminate, `progressViewStyle`), Gauge (value range, three value labels, `gaugeStyle`), TextField (controlled text, `prompt`, `submitLabel`, `onSubmit`, `axis`) and SecureField | keyboard type and programmatic focus, which need UIKit types and `@FocusState` |
| Sheets | controlled `isPresented`, RN children, fixed detents (`medium`, `large`, fraction, height), `onDismiss`, nested sheets, `interactiveDismissDisabled`, local slot origin and a supplied touch handler | fitToContents, selected detent binding, presentationBackground, backgroundInteraction, presentationSizing |
| Other presentation | Alert and ConfirmationDialog as generated zero-size presentation hosts: controlled `isPresented`, data-driven actions with roles, `onAction` by id, `titleVisibility`; `Swift.Popover` as a composed trigger with a presented React Native body, `arrowEdge` and `presentationCompactAdaptation` | `presenting:` value-bound overloads, `attachmentAnchor` |
| Layout | bounded RN tab pages, menu triggers, presented sheet RN content, and leaf controls with default heights that need parent width | native stacks, text/labels, forms, sections, scroll/list/grid, explicit RN slots |
| Navigation | One keeps ownership | evaluate native SwiftUI navigation separately from One integration |
| Media/shapes | menu SF Symbols | images, shapes, masks, backgrounds, overlays, sharing, charts |

Coverage counts must distinguish exported names, compiled bindings, and exercised
behavior. A generated declaration alone is not working feature coverage. Keep
unsupported platform/style combinations explicit. Picker, DatePicker, ColorPicker,
Toggle, Slider, Stepper, and Sheet bindings compile, and the native-features app
build passed. The picker, form-control, and sheet simulator suites pass on iOS 26.4.
Picker styles and date presentations are exercised individually; form controls
assert native acceptance, rejection, and reset; sheets assert RN interaction,
retained state, nested presentation, detent sizing, and dismissal behavior. The
tab/menu suite also passes native selection, reordered RN state retention, kept-open
checked/mixed controls, nested actions, and two accessible remounts with identical
menu data.

## Replacing @vxrn/native

| Existing surface | Migration requirement |
| --- | --- |
| Color | preserve/rehome iOS and Android system-token APIs; unrelated to a SwiftUI view wrapper |
| ToolbarHost / ToolbarItem / MenuAction | support existing native bar ownership and callbacks or adapt callers to an explicit replacement |
| StackToolbar | retain One registration and native-stack header/bottom-bar integration |
| SplitView | preserve react-native-screens column/navigation behavior |
| ZoomTransitionSource / Enabler / AlignmentRectDetector | preserve native-stack transition identity, source geometry and dismissal behavior |

Adding SwiftUI Toolbar or NavigationStack does not replace One's native-stack
integration. Move each integration only after matching its current callers and
runtime behavior. The current package remains usable during migration.

## Validation and continuation

- Reuse the native-features app as the executable conformance fixture.
- Assert mounted content before interaction; verify both native events and React prop updates.
- Exercise rejection, reordering, repeated presentation/dismissal, and RN state retention.
- Compile generated output and check regeneration determinism. CI runs
  `generate:check`, TypeScript typecheck, package tests, then a native-features
  consumer prebuild, `pod install`, and xcodebuild.
- Capture screenshots and machine-readable outcomes for future Soot conformance.
- Measure package/JS/native size separately. Report runtime environment and configuration.
- After 3–4 substantial families work, hand the committed branch, test commands,
  coverage matrix, failures, and worker ownership to Opus at extra-high reasoning.
- The continuing manager assigns bounded Grok/AGY implementation and retains
  quality control. Broad parity is an ongoing target, not a percentage inferred
  from the SDK declaration inventory.

## Baseline at 3dcfe61d2

| Measurement | Result | Meaning |
| --- | ---: | --- |
| npm compressed package | 36,132 bytes | `npm pack --dry-run --json --ignore-scripts`, includes sources/types/maps |
| npm unpacked package | 188,040 bytes | distribution contents, not installed app growth |
| minified native JS entry | 6,979 bytes | Bun browser bundle with React/RN external |
| gzip native JS entry | 2,240 bytes | same bundle, not Hermes bytecode |
| arm64 simulator Release `__TEXT` | 148,778 bytes | OneNative archive object sections, before app linking/dead stripping |
| arm64 simulator Release `__DATA` | 22,965 bytes | same archive |
| arm64 simulator Release archive | 5,196,584 bytes | includes debug and object metadata; not shipped app payload |

Host-side menu flattening on Bun 1.4.0, 50 warmups and 200 samples: p50/p95 were
0.012/0.018 ms for 10 actions, 0.046/0.076 ms for 100, and 0.355/1.047 ms for
1,000. These are validation/serialization microbenchmarks on the development
machine, not UI frame timing or Hermes/device measurements.

The transport is Fabric props/events plus direct native Fabric state updates for
tab geometry. There is no Nitro dependency. Review whether any new operation
actually needs synchronous non-view transport before adding one.

Reproduce the JS baseline with `bun packages/one-native/codegen/measure.ts`.
Native baseline command: `xcodebuildmcp simulator build --project-path
tests/native-features/ios/Pods/Pods.xcodeproj --scheme OneNative --configuration
Release --simulator-id <uuid>`. Inspect the arm64 archive under
`ios/build/Pods.build/Release-iphonesimulator/OneNative.build/Objects-normal/arm64/Binary`
with `xcrun size`; the Pod project sets its own build output directory.

## Expansion measurements

Measured after adding six leaf controls and sheets, with the native runtime shared
by all hosts. The working tree includes the expansion; the earlier baseline SHA
printed by `measure` is qualified by `dirty: true`.

| Measurement | Result |
| --- | ---: |
| minified native JS entry, React/RN external | 20,334 bytes |
| gzip native JS entry | 4,653 bytes |
| arm64 simulator Release `__TEXT` | 421,750 bytes |
| arm64 simulator Release `__DATA` | 64,516 bytes |
| arm64 simulator Release archive | 19,850,736 bytes |

The npm distribution is approximately 84 KB compressed and 598 KB unpacked across
276 entries, including source, generated bindings, type declarations, and maps.
README changes affect that archive size. The much larger native static archive
includes debug/object metadata and is not the final app size. Linked device app
size and frame timing remain unmeasured.

With the same Bun 1.4.0 benchmark configuration, menu flattening p50/p95 was
0.0023/0.0062 ms for 10 actions, 0.0152/0.0233 ms for 100, and 0.0481/0.0961 ms for
1,000. These local runs support the straight-line validator change; they do not
establish Hermes or end-to-end UI performance.

Final simulator receipts: `tabs-menu` 55 passed conditions, `pickers` 26 passed conditions, `forms` 30 passed conditions, `sheets` 32 passed conditions. These counts describe the exercised behaviors in the runner, not a coverage percentage. All four suites passed on the rebuilt app after the Fabric recycling fix.

## Leaves and dialogs wave

Six suites pass on iPhone 16 / iOS 26.4 against a Debug build of the native-features
app: `tabs-menu` 58, `pickers` 29, `forms` 31, `sheets` 34, `leaves` 71, `dialogs` 32
passed conditions. The four earlier suites gained a condition each from a new home
navigation helper and are otherwise unchanged, so they also serve as the regression
check on the generalized control emitter.

What the two new suites establish at runtime:

- Button emits exactly one numbered press per tap, a tap while disabled emits nothing,
  and all five button styles plus the destructive role keep the native button present.
- ProgressView reports a determinate percentage through accessibility, drops it when
  `value` is omitted, and reports one again when a value returns. Gauge steps through
  its range and its three styles.
- TextField and SecureField accept typed text, roll a rejected edit back to the native
  value, take an external value, reset through `revision`, and emit exactly one submit.
  SecureField masks every character in the accessibility tree while the controlled
  value is exact.
- Alert presents from a zero-size host, and a button raises both the dismissal and its
  action exactly once. Refusing the dismissal in React rolls the native value back and
  re-presents the alert, which is the presentation-host case of the controlled protocol.
- ConfirmationDialog adapts to a popover anchored to the host's own position in React
  Native layout. That adaptation draws no cancel button; tapping outside raises the
  cancel-role action and reports the dismissal. `titleVisibility` shows and hides the
  title. Both hosts start clean after two route re-entries.

Three runtime facts the accessibility snapshot forced, recorded so they are not
rediscovered: a presented dialog owns the accessibility tree, so the app's own status
rows are invisible while it is up; a SecureField reports as a `TextField` carrying the
`AXSecureTextField` subrole; and an attached hardware keyboard suppresses the software
keyboard, so there is no keyboard element to wait on before typing.
