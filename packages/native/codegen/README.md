# SwiftUI generation plan

## Current human work per API

`Extract.swift` parses the SDK's SwiftUI, SwiftUICore, and framework overlay interfaces into declarations. `inventory.ts` normalizes them and checks availability. The generator then selects only names and signatures written in `catalog.ts`, `controlCatalog.ts`, `leafCatalog.ts`, `emitContainers.ts`, `emitSheet.ts`, and `emitPopover.ts`. A new view needs a constructor recipe, fields, a React adapter, a Fabric spec, and Swift hosting code. A new modifier needs a catalog selector, a transport field in a control or container, a TypeScript prop, and a Swift call. `swiftStyle` also needs a field, its native conversion, and an application call. The manifest reports declarations that are still unmapped; it does not bind them. `One.iOS` spreads `Swift`, so an emitted `Swift` member reaches both namespaces once exported. The generic leaf derivation introduced in `bf6713036` and wired in `2f766e892` derives Swift calls only after a person writes a leaf recipe. Coverage introduced in `d10d7834a` measures the gap but does not close it.

## Plan

1. Read public `View` methods and public view types from the SDK inventory. Classify parameters by the types the React Native bridge can represent directly: booleans, numbers, strings, and SDK enum values. Generate prop types, defaults, native conversion, and Swift application from those declarations. Prefer one SDK-selected signature per prop and fail on ambiguous overloads. Keep the iOS availability gate in generated Swift and the version metadata in the manifest.
2. Keep explicit overrides only for semantics absent from a signature: bindings and events, generic construction, view-building closures and slots, layout ownership, and values such as `Color` needing conversion. List each override category and its files below. `tabViewBottomAccessory` uses a view-building slot; its placement is an SDK environment value that accessory content can read.
3. Regenerate, typecheck, build a native consumer, and render an accessory plus two newly derived modifiers in an iOS 27 simulator. Record modifier counts before and after. Check generation for drift and run the native tests covering the touched interfaces.

## Semantic overrides

- Closures and bindings: `controlCatalog.ts`, `leafCatalog.ts`, and `controlTypes.ts` choose React events, controlled values, actions, and constructors with label or content closures. A Swift closure signature does not say which state React owns or when an event fires.
- View builders: `emitContainers.ts`, `emitSheet.ts`, and `emitPopover.ts` map React children to SwiftUI slots and own layout, presentation, and dismissal. `Tabs.native.tsx` and `OneNativeTabsView.swift` map tab pages and `tabViewBottomAccessory` content to slots; the accessory reads its placement environment there.
- Generics and non-scalar values: `catalog.ts` supplies menu tree payloads, style conversions such as `Color` and `ShapeStyle`, and framework imports. Generic constraints do not identify the concrete React value or native conversion.
- Handwritten native hosts: `catalog.ts` retains `OneSwiftHost` in the Fabric component provider map because it has no SwiftUI SDK view declaration.

SDK signatures cannot choose a React Native layout model or what React children feed a `@ViewBuilder`. These stay explicit. Scalar, enum, callback, and binding modifier names and argument types come from the SDK. Callback modifiers dispatch a named native event; bindings carry a controlled value and `onChange` callback through the same event path.

Public zero-argument `View` methods without generic requirements are derived as boolean enable props. This adds 17 names, including `hidden`, `labelsHidden`, and `compositingGroup`, with availability checks and framework imports for overlay methods. Callback and `Binding<Bool|String>` signatures with defaulted other parameters use one generated event transport. More complex closure shapes, non-scalar bindings, and generic constraints still need a hand mapping. The next cheapest class to derive is a single `@ViewBuilder` child parameter with a generic named slot.

## Result

The iOS 27 SDK inventory now supplies parameterless public views and unambiguous one-argument scalar or enum `View` modifiers. The generator emits their React props, native transport, Swift calls, and availability metadata. Derived modifiers use one JSON field in the existing `swiftStyle` Fabric struct, so adding an SDK modifier does not add a C++ prop to every generated host. Swift applies only modifiers present in that field, in prop order.

`bun run coverage` reports 177 bound/generated modifier names out of 522 public `View` modifier names in the iOS 27 SDK (34%). It counts module/name pairs rather than overloads, across SwiftUI, SwiftUICore, and every installed SwiftUI overlay. Of the 177 bound names, 137 are selected from SDK signatures without a per-name catalog entry; the rest have semantic mappings. Coverage was 51 bound names before this work, then 149 with the iOS 26 ceiling, 152 at the iOS 27 ceiling, 169 after parameterless methods, and 177 after callback and binding transport. The three newly included iOS 27 modifiers are `defaultTabBarPlacement`, `presentationPlacement`, and `textInputBorderShape`. View coverage rose from 32 to 34 with `EditButton` and `EmptyView`.

`bold` and `tracking` are two previously unmapped modifiers exercised by `tests/native-features/app/one-native-autogen.tsx`. `tabViewBottomAccessory` is a `@ViewBuilder` slot on `TabView`, so its slot mapping and placement environment remain the explicit Tabs override listed above. The iOS 27 simulator proof shows expanded and inline placements. Native iOS CI now uses the Xcode 27 runner image, and `generate.ts` accepts iOS 27 symbols into checked-in bindings.
