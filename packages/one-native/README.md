# One Native

Generated SwiftUI tabs, menus, pickers, form controls, and sheets for React Native,
exposed through `Swift`. This is an initial implementation on the `feat/one-native`
branch. It requires an iOS 18+ native build and React Native's New Architecture. It
is not published to npm.

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

## Pickers and form controls

Standalone pickers and form controls take flat props. They do not take option or
value children. Each control sets a default height and expands to the parent
width, so the parent must provide a width (`width: '100%'` is enough). Default
heights are 44, except `Picker` `wheel`/`inline` (216), `DatePicker` `wheel` (216), and
`DatePicker` `graphical` (360).

```tsx
function Controls() {
  const [letter, setLetter] = useState('alpha')
  const [when, setWhen] = useState(new Date('2026-09-10T12:00:00Z'))
  const [color, setColor] = useState('#3366FF')
  const [enabled, setEnabled] = useState(true)
  const [volume, setVolume] = useState(25)
  const [guests, setGuests] = useState(2)
  return (
    <View style={{ width: '100%' }}>
      <Swift.Picker
        label="Letter"
        selection={letter}
        onSelectionChange={setLetter}
        options={[
          { value: 'alpha', label: 'Alpha' },
          { value: 'beta', label: 'Beta' },
        ]}
        pickerStyle="menu"
      />
      <Swift.DatePicker
        label="Appointment"
        selection={when}
        onSelectionChange={setWhen}
        minimumDate={new Date('2026-01-01T00:00:00Z')}
        maximumDate={new Date('2026-12-31T23:59:59Z')}
        displayedComponents="date"
        datePickerStyle="compact"
      />
      <Swift.ColorPicker
        label="Accent"
        selection={color}
        onSelectionChange={setColor}
        supportsOpacity
      />
      <Swift.Toggle label="Notifications" isOn={enabled} onIsOnChange={setEnabled} />
      <Swift.Slider
        label="Volume"
        value={volume}
        onValueChange={setVolume}
        minimumValue={0}
        maximumValue={100}
        step={5}
      />
      <Swift.Stepper
        label="Guests"
        value={guests}
        onValueChange={setGuests}
        minimumValue={0}
        maximumValue={10}
        step={1}
      />
    </View>
  )
}
```

`Picker` options are `{ value, label }` strings. The list must not be empty,
values must be unique, and `selection` must match one of them. Supported
`pickerStyle` values are `automatic`, `menu`, `segmented`, `wheel`, and `inline`.
`navigationLink` and `palette` throw: those styles need a native container context
that One Native does not provide. Outside a native Form, iOS renders the inline
picker as a wheel; the standalone host reserves the same height.

`DatePicker` `selection`, `minimumDate`, and `maximumDate` are `Date` values.
Omitted bounds default to a wide range. The selection must be a finite date inside
that range, and `minimumDate` must not be after `maximumDate`.
`displayedComponents` is `date`, `hourAndMinute`, or `dateAndTime` (default).
`datePickerStyle` is `automatic`, `compact`, `graphical`, or `wheel`.

`ColorPicker` `selection` is `#RRGGBB` or `#RRGGBBAA`. `supportsOpacity` defaults
to true.

`Toggle` `isOn` is a boolean. `toggleStyle` is `automatic`, `button`, or `switch`.

`Slider` and `Stepper` take finite `value`, `minimumValue`, `maximumValue`, and
`step` numbers. `minimumValue` must be less than `maximumValue`, `step` must be
greater than 0, and `value` must sit in that range. Defaults are 0, 100, and 1.

Every control also accepts `label`, `disabled`, and `revision`.

## Sheets

`Swift.Sheet` presents its React Native children in a SwiftUI sheet. The host has
zero width and height and does not take layout space. Keep the sheet mounted while
it can present. Children stay in the React tree when dismissed, so local RN state
is retained.

```tsx
function ExampleSheet() {
  const [open, setOpen] = useState(false)
  const [nested, setNested] = useState(false)
  const [dismisses, setDismisses] = useState(0)
  return (
    <>
      <Text>Dismisses: {dismisses}</Text>
      <Swift.Sheet
        isPresented={open}
        onIsPresentedChange={setOpen}
        onDismiss={() => setDismisses((count) => count + 1)}
        presentationDetents={['medium', 'large']}
        presentationDragIndicator="automatic"
        interactiveDismissDisabled={false}
      >
        <View style={{ flex: 1, padding: 16 }}>
          <Text>Sheet body</Text>
          <Swift.Sheet isPresented={nested} onIsPresentedChange={setNested}>
            <View style={{ flex: 1, padding: 16 }}>
              <Text>Nested sheet</Text>
            </View>
          </Swift.Sheet>
        </View>
      </Swift.Sheet>
    </>
  )
}
```

`isPresented` and `onIsPresentedChange` use the same controlled protocol as the
other hosts. `onDismiss` runs after a matching-revision dismiss. At least one
detent is required. Detents are `medium`, `large`, `{ fraction }` with a value in
`(0, 1]`, or `{ height }` with a positive point height. The default is `['large']`.
`presentationDragIndicator` is a `Visibility` value. `interactiveDismissDisabled`
blocks the swipe-to-dismiss gesture when true.

Presented sheet content reports Fabric slot state with a local origin. The content
host supplies a touch handler because presentation leaves the RN surface, the same
situation as React Native's `Modal`. If that content uses
`react-native-gesture-handler`, wrap it in `GestureHandlerRootView` as you would
inside `Modal`. one-native does not add that package.

A `Swift.Sheet` inside presented children presents a nested sheet.

Add `one-native: workspace:*` to the native application's dependencies and rebuild
the app after installing pods. `tests/native-features/app/one-native.tsx` exercises
selection, reordered pages with local state, and nested menus. Control and sheet
fixtures live under `tests/native-features`. The picker, form-control, and sheet
simulator suites pass on iOS 26.4, including rejected native changes and retained
RN state in presented content. The package's build, typecheck, and test scripts run
from `packages/one-native`. See `tests/native-features/scripts/README.md` for the
conformance commands and their device/automation constraints.

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
The generator matches constructors by full parameter labels and types, and matches
modifiers by those signatures plus generic constraints. It derives enum cases and
iOS availability from SDK declarations, then emits:

- public TypeScript types and runtime availability validation
- Fabric component specs, menu payload validation and Objective-C++ conversion
- SwiftUI menu constructors, a tab constructor, and modifier dispatch
- typed leaf Swift and Objective-C++ hosts for pickers and form controls
- sheet types and a presented RN content slot
- an SDK manifest, input hashes, and unbound menu/tab modifier names
- `one-native/schema.json`, describing native props, events, payloads, and RN slots
  for preview adapters and conformance checks

It typechecks the assembled Swift at the minimum iOS version and runs the
controlled-state protocol probe. CI runs `generate:check`, TypeScript typecheck,
package tests, then a native-features consumer prebuild, `pod install`, and
xcodebuild. Normal package builds use the generated files and do not need to run
the generator.

`codegen/Extract.swift` uses the selected toolchain's SwiftParser and SwiftSyntax
to parse SwiftUI and SwiftUICore `.swiftinterface` files. `codegen/catalog.ts`
defines the supported constructor recipes and React-specific mappings, including
identity, child slots, and controlled events. Picker and form recipes live in
`codegen/pickerCatalog.ts` and `codegen/formCatalog.ts`.

Change the catalog or generator, regenerate, rebuild the native app, and exercise
the integration fixture. `generate:check` fails if any output differs. Extending
coverage still requires a semantic mapping where an API introduces a new kind of
binding, slot, or layout behavior. The SDK does not supply that React integration.

## Composition and controlled state

Fabric children carry RN subtrees. Pure native content uses typed data props;
a host can support both. Menu nodes flatten to `parentId` records because RN
codegen cannot express recursive object arrays. Tabs use keyed Fabric children
because each page contains a live React subtree. Leaf controls use data props.
Sheets host RN children in a presented slot.

Tabs, menu toggles, pickers, form controls, and sheets share optimistic native
state and numbered acknowledgments. Update React state synchronously in the
callback to accept an interaction. Keeping the prior value rejects it when the
event is acknowledged. Increment `revision` to force a new value while earlier
events are pending. Events from the previous revision are ignored. Revision is a
nonnegative Int32 scoped to that component.

The shared RN slot has three policies. SwiftUI allocates tab bounds and reports
them to Fabric for Yoga. Passive menu triggers retain Yoga's coordinates and
leave interaction to the enclosing SwiftUI menu. Presented sheet content uses a
local origin and a supplied touch handler because it leaves the RN surface.

General SwiftUI tree composition, additional SDK bindings, browser rendering,
and Android rendering remain separate stages in `plans/one-native-architecture.md`.
The existing `@vxrn/native` remains available for its navigation integrations.
