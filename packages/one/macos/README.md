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
