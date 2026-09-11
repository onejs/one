# One Native

Apple-native tabs and menus for React Native, exposed through `Swift`. This is an
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
    singleSelection: true,
    children: [
      { type: 'action', id: 'newest', title: 'Newest', state: 'on' },
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

`Swift.Menu` uses a Fabric component with UIKit `UIMenu` and `UIAction`. Menu item
ids are unique across the whole menu. Submenus support inline groups, palettes,
single selection, and preferred element size. Actions support SF Symbols,
subtitles, discoverability titles, disabled/hidden/destructive attributes,
off/on/mixed state, and keeping the menu presented after selection. State is
supplied by the application; selecting an action sends its id to `onAction`.

The menu's children supply its visual trigger. The native menu button owns that
trigger's interaction and accessibility label; use a `View` or a Tamagui layout
as its content. Put independent interactive controls outside the trigger.

Add `one-native: workspace:*` to the native application's dependencies and rebuild
the app after installing pods. `tests/native-features/app/one-native.tsx` exercises
selection, reordered pages with local state, and nested menus. The package's
build, typecheck, and test scripts run from `packages/one-native`.

This slice does not provide a general SwiftUI tree, SDK-wide generated bindings,
browser rendering, or Android rendering. Those are separate stages in
`plans/one-native-architecture.md`. The existing `@vxrn/native` remains available
for navigation integrations that this package has not replaced.
