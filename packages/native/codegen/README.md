# SwiftUI generation plan

## Current human work per API

`Extract.swift` parses the SDK's SwiftUI, SwiftUICore, and framework overlay interfaces into declarations. `inventory.ts` normalizes them and checks availability. The generator then selects only names and signatures written in `catalog.ts`, `controlCatalog.ts`, `leafCatalog.ts`, `emitContainers.ts`, `emitSheet.ts`, and `emitPopover.ts`. A new view needs a constructor recipe, fields, a React adapter, a Fabric spec, and Swift hosting code. A new modifier needs a catalog selector, a transport field in a control or container, a TypeScript prop, and a Swift call. `swiftStyle` also needs a field, its native conversion, and an application call. The manifest reports declarations that are still unmapped; it does not bind them. `One.iOS` spreads `Swift`, so an emitted `Swift` member reaches both namespaces once exported. The generic leaf derivation introduced in `bf6713036` and wired in `2f766e892` derives Swift calls only after a person writes a leaf recipe. Coverage introduced in `d10d7834a` measures the gap but does not close it.

## Plan

1. Read public `View` methods and public view types from the SDK inventory. Classify parameters by the types the React Native bridge can represent directly: booleans, numbers, strings, and SDK enum values. Generate prop types, defaults, native conversion, and Swift application from those declarations. Prefer one SDK-selected signature per prop and fail on ambiguous overloads. Keep the iOS availability gate in generated Swift and the version metadata in the manifest.
2. Keep explicit overrides only for semantics absent from a signature: bindings and events, generic construction, view-building closures and slots, layout ownership, and values such as `Color` needing conversion. List each override category and its files below. `tabViewBottomAccessory` uses a view-building slot; its placement is an SDK environment value that accessory content can read.
3. Regenerate, typecheck, build a native consumer, and render an accessory plus two newly derived modifiers in an iOS 27 simulator. Record modifier counts before and after. Check generation for drift and run the native tests covering the touched interfaces.

## Semantic overrides

- `controlCatalog.ts`, `leafCatalog.ts`, `controlTypes.ts`: controlled values, actions, binding closures, and constructors with label or content closures.
- `emitContainers.ts`, `emitSheet.ts`, `emitPopover.ts`: SwiftUI child slots, measured layout, presentation and dismissal behavior.
- `catalog.ts`: menu tree payloads, special style conversions, and framework imports.
- `catalog.ts`: handwritten Fabric hosts such as `OneSwiftHost`, which have no SwiftUI SDK view declaration.
- `Tabs.native.tsx` and `OneNativeTabsView.swift`: tab selection, page hosting, and accessory content placement.

SDK signatures cannot choose a React event contract, ownership of a binding, a React Native layout model, or what React children feed a `@ViewBuilder`. These stay explicit. Scalar and enum modifier names and argument types should not.

## Result

The iOS 27 SDK inventory now supplies parameterless public views and unambiguous one-argument scalar or enum `View` modifiers. The generator emits their React props, native transport, Swift calls, and availability metadata. Derived modifiers use one JSON field in the existing `swiftStyle` Fabric struct, so adding an SDK modifier does not add a C++ prop to every generated host. Swift applies only modifiers present in that field, in prop order.

Modifier coverage rose from 51 names to 149 names; 109 are SDK-derived. View coverage rose from 32 to 34 with `EditButton` and `EmptyView`. `bold` and `tracking` are two previously unmapped modifiers exercised by `tests/native-features/app/one-native-autogen.tsx`. `tabViewBottomAccessory` is a `@ViewBuilder` slot on `TabView`, so its slot mapping and placement environment remain the explicit Tabs override listed above. The iOS 27 simulator proof shows expanded and inline placements. The generated bindings retain an iOS 26 symbol ceiling while native CI uses Xcode 26.4; the inventory is read from the installed iOS 27 SDK, and a future CI SDK bump can raise the ceiling in `generate.ts`.
