# One Native

Generated SwiftUI tabs and menus for React Native, exposed through `Swift`. This is an
initial implementation on the `feat/one-native` branch. It requires an iOS 18+
native build and React Native's New Architecture. It is not published to npm.

```tsx
import { useState } from 'react'
import { Text, View } from 'react-native'
import { Swift, type MenuItem } from 'one-native'

const actions: MenuItem[] = [
  { type: 'action', id: 'copy', title: 'Copy', systemImage: 'doc.on.doc' },
  {
    type: 'submenu',
    id: 'sort',
    title: 'Sort',
    children: [
      { type: 'action', id: 'newest', title: 'Newest' },
      { type: 'action', id: 'oldest', title: 'Oldest' },
    ],
  },
]

export function App() {
  const [selection, setSelection] = useState('inbox')
  const [lastAction, setLastAction] = useState('none')
  return (
    <Swift.Tabs selection={selection} onSelectionChange={setSelection}>
      <Swift.Tab id="inbox" title="Inbox" systemImage="tray" badge="3">
        <View style={{ flex: 1, padding: 24 }}>
          <Text>Last action: {lastAction}</Text>
          <Swift.Menu
            accessibilityLabel="Message actions"
            items={actions}
            onAction={setLastAction}
          >
            <View style={{ padding: 16 }}>
              <Text>Actions</Text>
            </View>
          </Swift.Menu>
        </View>
      </Swift.Tab>
      <Swift.Tab id="settings" title="Settings" systemImage="gearshape">
        <Text>Ordinary React Native or Tamagui content goes here.</Text>
      </Swift.Tab>
    </Swift.Tabs>
  )
}
```

`Swift.Tabs` owns a SwiftUI `TabView` hosted by a Fabric component. It has no
React Navigation dependency. Each keyed page hosts ordinary RN views through
`UIViewRepresentable`, preserving the React tree and its providers. SwiftUI's
bounded page allocation updates Fabric state directly; Yoga lays out the RN
subtree inside those bounds. `sidebarAdaptable` uses Apple's adaptive tab style.

Native taps update the visible tab immediately and emit a numbered selection
request. After `onSelectionChange` returns, the adapter acknowledges that request
with the current `selection`. Keeping the old selection rejects the tap. Update
selection synchronously in the callback to accept it; asynchronous decisions
should keep the old selection until ready. A newer pending tap ignores an older
acknowledgement.

Tabs require unique nonempty `id` values, a selection naming a mounted tab, and
direct `Swift.Tab` children (arrays and conditional children are supported).
Pages mount eagerly and keep their React state when switching tabs. Give the tabs
container bounded space, normally using `flex: 1` in a bounded parent.

`Swift.Menu` renders actual SwiftUI `Menu`, `Button`, `Toggle`, `Section`,
`Divider`, and `ControlGroup` views. Every node has a unique nonempty `id`.
Use `type: 'submenu'` for nested menus, `type: 'section'` for groups with optional
headings, and `type: 'divider'` for explicit separators. `controlGroup` supports
SDK-derived styles, including `palette`, `menu`, and `compactMenu`.

Actions support SF Symbols, `role`, `disabled`, `hidden`, `help`, and
`menuActionDismissBehavior`. Use `menuOrder="fixed"` to preserve declaration order.
Use `menuActionDismissBehavior="disabled"` to keep a menu open after an action.
Both modifiers can be applied to the root menu or individual supported nodes.

Checked and mixed states use SwiftUI's binding-based `Toggle`. A toggle node has
`values: [true]` for one checked value, or a collection such as `[true, false]`
for mixed source values. Provide `onValueChange(id, value, sourceIndex)` and update
that source in React state. SwiftUI may update each source separately; use a
functional state update to preserve every change. Button actions call `onAction`.

`Swift.Tab` accepts `role="search"`. `Swift.Tabs` accepts the SDK-derived
`tabBarMinimizeBehavior` values on iOS 26+. Unsupported enum values and OS versions
are rejected before submitting native props. Omit the modifier on older iOS.

The menu's children supply its visual trigger. The SwiftUI menu owns that
trigger's interaction and accessibility label; use a `View` or a Tamagui layout
as its content. Put independent interactive controls outside the trigger.

Add `one-native: workspace:*` to the native application's dependencies and rebuild
the app after installing pods. `tests/native-features/app/one-native.tsx` exercises
selection, reordered pages with local state, and nested menus. The package's
build, typecheck, and test scripts run from `packages/one-native`.

## Generation

From `packages/one-native`, run:

```sh
bun run generate
bun run generate:check
bun run build
bun run typecheck
bun run test
```

Generation requires Xcode and its macOS/iPhoneSimulator SDKs. The checked-in
manifest records the SDK and Swift compiler versions used for the current output.
Normal package builds use the generated files and do not need to run the generator.

`codegen/Extract.swift` uses the selected toolchain's SwiftParser and SwiftSyntax
to parse SwiftUI and SwiftUICore `.swiftinterface` files. `codegen/catalog.ts`
defines the supported constructor recipes and React-specific mappings, including
identity, child slots, and controlled events. The generator derives enum cases
and iOS availability from SDK declarations, checks selected constructor/modifier
signatures, and emits:

- public TypeScript types and runtime availability validation;
- Fabric component specs, menu payload validation and Objective-C++ conversion;
- SwiftUI menu constructors, a tab constructor, and modifier dispatch;
- an SDK manifest, input hashes, and unbound menu/tab modifier names.

Change the catalog or generator, regenerate, rebuild the native app, and exercise
the integration fixture. `generate:check` fails if any output differs. Extending
coverage still requires a semantic mapping where an API introduces a new kind of
binding, slot, or layout behavior. The SDK does not supply that React integration.

General SwiftUI tree composition, additional SDK bindings, browser rendering,
and Android rendering remain separate stages in `plans/one-native-architecture.md`.
The existing `@vxrn/native` remains available for its navigation integrations.
