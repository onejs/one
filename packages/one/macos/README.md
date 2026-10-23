# One on macOS

Native macOS host for One, shipped inside the `one` package. Every Mac native
byte lives under this directory so iOS, Android and web gain nothing. See
`plans/one-macos-native.md` at the repo root.

- `cpp/`: the macOS text layout manager and C++ glue for the React Native core
- `host/`: the AppKit mounting layer, SwiftUI hosting and TurboModules
- `react-native/`: JS overrides resolved only for `platform=macos`
- `template/macos/`: the generated Mac app project

## Native controls

`One.macOS.Button` renders a bordered AppKit `NSButton`. Pass `title`, an
optional SF Symbol name in `systemImage`, `disabled`, and `onPress`. Set an
`accessibilityLabel` for an image-only button. Both controls accept View props
such as `style`, `testID`, `accessibilityLabel`, and `accessibilityHint`.

`One.macOS.SegmentedControl` renders an AppKit `NSSegmentedControl` with
`labels`, a controlled `selectedIndex` (zero based, or `-1` for no selection),
`disabled`, and `onChange({ selectedIndex, revision })`. Accept a selection by
updating `selectedIndex` in `onChange`; leaving it unchanged rejects the
selection. Like Toggle, `revision` defaults to zero. Increment it to replace
pending native interactions with an external value. Acknowledgements and
native event counts use the existing V2 controlled-value protocol.

```tsx
<One.macOS.Button title="New pane" systemImage="plus" onPress={addPane} />
<One.macOS.SegmentedControl
  labels={['All', 'Shares', 'Flags', 'Asks']}
  selectedIndex={filter}
  onChange={({ selectedIndex }) => setFilter(selectedIndex)}
/>
```

The app target must compile `host/swift/OneMacControls.swift` alongside
`OneNativeControlled.swift` and import `OneMacosControlsHosting.h` in its
bridging header, as the bundled template does. The Mac CMake target registers
both Fabric components. These specs stay in `src/platform/mac`, outside iOS
and Android codegen. Native AppKit children own keyboard and accessibility
interaction; their actions do not activate the app or move the cursor.

## System colors

React Native's `PlatformColor` resolves to real AppKit colors. Each name is
tried in order as an asset catalog color, then as an `NSColor` class color, so
`PlatformColor('labelColor')` and `PlatformColor('label')` are both
`NSColor.labelColor`. The view keeps the `NSColor` itself and AppKit resolves
it while drawing, so appearance and system color changes, such as the
accent color, repaint without a React render. High contrast variants follow
the system Increase contrast setting; AppKit maps an app requested high
contrast appearance to the plain one. A name that resolves nothing uses `{ fallback }`, or
draws nothing.

```tsx
<View style={{ backgroundColor: PlatformColor('windowBackgroundColor') }}>
  <Text style={{ color: PlatformColor('labelColor') }}>Inbox</Text>
  <View style={{ backgroundColor: PlatformColor('controlAccentColor') }} />
</View>
```

Ordinary colors stay packed sRGB values. Reading a system color as numbers,
for example in an animation, takes the app's current appearance at that time.
`DynamicColorIOS` is not supported on macOS.

## Linear backgrounds

React Native's `backgroundImage` paints linear gradients in the native view.
It accepts the existing string and structured stop forms, including
`PlatformColor` stops. Layers follow their declared order, clip to rounded
bounds and stay below the border. Appearance and size changes repaint them.

```tsx
<View style={{
  width: 160,
  height: 32,
  borderRadius: 8,
  backgroundImage: 'linear-gradient(90deg, rgba(0, 100, 240, 0.5), transparent)',
}} />
```

Radial and repeating gradients, transition hints and pattern-color stops are
unsupported. A layer with unsupported stops is left unpainted. Native fixture
recipes are in `tests/macos-basic/probe/GRADIENTS.md` in the repository.

## Logs

The host writes JS console output, errors and exceptions to the unified log
under `[one-macos]`. Debug builds show the text, for example in
`log show --predicate 'eventMessage CONTAINS "[one-macos]"'`. Release builds
mark it private, so a logged token or credentialed URL is redacted unless the
device has private data logging enabled.

## App commands

`One.macOS.AppCommands` puts commands in the native menu bar and key
equivalents. Its config is react-native-gpui's `AppCommands` shape, so one
command table serves both hosts.

```tsx
One.macOS.AppCommands.configure({
  bindings: [
    { id: 'pane.next', key: 'ctrl-tab' },
    { id: 'pane.focusNext', key: 'tab', context: '!Input' },
  ],
  toolbar: [
    { kind: 'flexibleSpace' },
    { kind: 'action', id: 'pane.inspector', label: 'Toggle Inspector', systemImage: 'sidebar.right', badge: 2 },
  ],
  menus: [
    { label: 'App', items: [{ kind: 'action', id: 'settings.open', label: 'Settings' }] },
    { label: 'View', items: [{ kind: 'action', id: 'pane.next', label: 'Next Pane' }] },
  ],
})
const remove = One.macOS.AppCommands.addListener((id) => run(id))
```

- The first menu joins the application menu below About. Other menus join a
  menu with the same title, such as View, or become a new menu before Window.
  The standard Edit, Window and Services menus stay in place.
- Each item shows the first key of its command. Every key also gets a hidden
  item that AppKit searches first, so a binding wins over a standard item with
  the same key.
- A context gates only the key, so a menu click still runs the command. The
  host sets one identifier, `Input`, while a text input has focus.
- An unsupported key, context or item throws from `configure` and leaves the
  previous menus in place.
- Items are disabled while no listener is registered, and a command reaches
  each listener once.
- Each root keeps its own config. The menu bar shows the config of the key
  window's root, else the main window's, else the frontmost One window's, and
  each action runs in the root that is current when it fires. An inactive app
  has no key or main window, so after a window reorder its menus refresh on
  the next event, such as a menu press.
- SwiftUI rebuilds the menus it owns, so the host restores its items after
  each menu edit. Stopping or reloading a root removes its items at once.

The optional `toolbar` array owns the window's native `NSToolbar`. Actions use
a typed SF Symbol name and route through that window's root, even while another
window is current. A non-negative integer `badge` shows a system count badge on
macOS 26 and later; zero removes it. Flexible spaces use AppKit's standard spacer.
Items disable when the root has no command listener. Reconfiguring labels or
badges preserves item identity; stopping the root or omitting `toolbar` restores
the shell's previous toolbar. An empty array installs an empty toolbar.

AppKit never matches a control-tab key equivalent, so the host runs those
bindings from a key monitor. Commands do not activate the app or move the
cursor.

The segmented control's optional `role` is `automatic` (the default), `tabs`, or
`valueSelection`. On macOS 27 and later it sets AppKit's matching role. Older
systems retain the existing rounded appearance and single-selection behavior.
