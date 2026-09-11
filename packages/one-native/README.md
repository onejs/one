# One Native

Generated SwiftUI tabs, menus, pickers, form controls, sheets, containers, popovers,
video, maps, and Quick Look for React Native, exposed through `Swift`. This is an
initial implementation on the `feat/one-native` branch. It requires an iOS 18+ native
build and React Native's New Architecture. It is not published to npm.

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
        <Text>Ordinary React Native content goes here.</Text>
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
trigger's interaction and accessibility label; use a `View` or any React Native layout
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

## Buttons, indicators, and text input

`Text`, `Label`, and `Image` display; `Button` signals; `ProgressView` and `Gauge`
only display; `TextField` and `SecureField` carry a controlled string. They take
the same flat props. None of them declares a height: SwiftUI measures each one
and reports it back to Yoga, so a wrapped `Text`, a circular `Gauge` and a
vertical `TextField` come out at their real heights without being told.

```tsx
function Leaves() {
  const [name, setName] = useState('')
  const [secret, setSecret] = useState('')
  return (
    <View style={{ width: '100%' }}>
      <Swift.Text text="Read only" />
      <Swift.Label label="Starred" systemImage="star.fill" />
      <Swift.Image systemName="star.fill" symbolRenderingMode="hierarchical" imageScale="medium" />
      <Swift.Button
        label="Delete"
        systemImage="trash"
        buttonRole="destructive"
        buttonStyle="bordered"
        onPress={() => remove()}
      />
      <Swift.ProgressView label="Uploading" value={0.4} total={1} />
      <Swift.ProgressView label="Working" progressViewStyle="circular" />
      <Swift.Gauge
        label="Speed"
        value={72}
        minimumValue={0}
        maximumValue={120}
        currentValueLabel="72"
        minimumValueLabel="0"
        maximumValueLabel="120"
        gaugeStyle="accessoryCircular"
      />
      <Swift.TextField
        label="Name"
        prompt="Your name"
        text={name}
        onTextChange={setName}
        submitLabel="done"
        onSubmit={() => save(name)}
      />
      <Swift.SecureField label="Password" text={secret} onTextChange={setSecret} />
    </View>
  )
}
```

`Text` renders its `text` verbatim, so it never looks up a localized string. `Label`
pairs a `label` with a required `systemImage` SF Symbol and localizes the label the way
SwiftUI does. `Image` renders an SF Symbol with `systemName`, optional `symbolRenderingMode`,
`symbolVariant`, `imageScale`, and `variableValue`. All three are display only: they have no events
and no controlled value, and they are most useful as rows inside a container.

`Button` needs a non-empty `label`. `systemImage` adds an SF Symbol. `buttonRole`
is `destructive`, `cancel`, `confirm`, `close`, or empty for none; it is named
`buttonRole` because React Native's `ViewProps` already owns `role` for the
accessibility role. `buttonStyle` is `automatic`, `plain`, `borderless`,
`bordered`, `borderedProminent`, `glass`, or `glassProminent`; the last two
require iOS 26. `onPress` does not fire while `disabled`.

`ProgressView` shows determinate progress when `value` is set and an
indeterminate spinner when it is omitted. `total` defaults to 1 and must be
greater than 0; `value` must sit between 0 and `total`. `progressViewStyle` is
`automatic`, `linear`, or `circular`.

`Gauge` takes finite `value`, `minimumValue` (default 0), and `maximumValue`
(default 1), with `value` inside that range. `currentValueLabel`,
`minimumValueLabel`, and `maximumValueLabel` are plain strings; an empty string
renders empty text rather than omitting the label. `gaugeStyle` is `automatic`,
`linearCapacity`, `accessoryLinear`, `accessoryLinearCapacity`,
`accessoryCircular`, or `accessoryCircularCapacity`.

`TextField` and `SecureField` take a controlled `text` string and report edits
through `onTextChange`, using the same acknowledgement and `revision` reset as the
other controls. `prompt` is the placeholder. `submitLabel` names the return key
and `onSubmit` fires when it is pressed. `textInputAutocapitalization` is `never`,
`words`, `sentences`, or `characters`; an empty value leaves the system default.
`autocorrectionDisabled` defaults to false. `TextField` also takes `axis`:
`vertical` makes it grow to multiple lines.

Keyboard type and programmatic focus are not bound. SwiftUI exposes those through
UIKit's `UIKeyboardType` and `@FocusState`, neither of which the current prop
pipeline carries.

## Video

`Swift.VideoPlayer` is SwiftUI's `VideoPlayer` from the `_AVKit_SwiftUI` overlay
module. Video has no ideal height to report, so unlike every other control it
takes the box React Native gives it: size it with `style`.

```tsx
<Swift.VideoPlayer
  url="https://example.com/clip.mp4"
  autoplay
  style={{ width: '100%', height: 220 }}
/>
```

`url` is required and must be a non-empty string. The `AVPlayer` is built once
per url and reused, so unrelated prop changes do not restart playback. `autoplay`
is read when the url loads; flipping it afterwards does not start or stop the
video.

AVKit publishes the player's own accessibility element over the control, so
`accessibilityLabel` never reaches a screen reader here even though every other
control honors it.

## Maps

`Swift.Map` is SwiftUI's `Map` from the `_MapKit_SwiftUI` overlay module. Like
video it has no ideal height to report, so it takes the box React Native gives
it: size it with `style`.

```tsx
<Swift.Map
  latitude={37.7955}
  longitude={-122.3937}
  distance={4000}
  markers={[
    { id: 'coit', label: 'Coit Tower', latitude: 37.8024, longitude: -122.4058 },
  ]}
  style={{ width: '100%', height: 220 }}
  onRegionChange={(latitude, longitude, distance) => setCamera({ latitude, longitude, distance })}
/>
```

`latitude`, `longitude` and `distance` place the camera: `distance` is metres
from the camera to the ground, which is how `MapCamera` frames a map. They seed
the camera and re-center it when they change, and the user is free to pan and
zoom in between. Panning is reported one way through `onRegionChange`, which
fires when a gesture ends rather than continuously.

The camera is deliberately not a controlled value. The controlled protocol
carries one scalar and a camera is three, and a map that could snap back to a
prop mid-gesture would be unusable. If you need the camera to follow React,
change the props; if you need to follow the user, read `onRegionChange`.

Each marker needs a unique `id`, a `label` and a coordinate. Ids must be unique
and coordinates must be finite, or the adapter throws.

## Alerts and confirmation dialogs

`Swift.Alert` and `Swift.ConfirmationDialog` are zero-size presentation hosts, like
`Swift.Sheet`: they take no layout space and present over the app. Their buttons are
data, not children, because SwiftUI builds them inside the presented dialog where a
React Native subtree cannot go.

```tsx
function DeleteButton({ item }: { item: Item }) {
  const [confirming, setConfirming] = useState(false)
  return (
    <View>
      <Swift.Button label="Delete" onPress={() => setConfirming(true)} />
      <Swift.Alert
        title="Delete item?"
        message="This cannot be undone."
        isPresented={confirming}
        onIsPresentedChange={setConfirming}
        actions={[
          { id: 'cancel', label: 'Cancel', role: 'cancel' },
          { id: 'delete', label: 'Delete', role: 'destructive' },
        ]}
        onAction={(id) => id === 'delete' && remove(item)}
      />
    </View>
  )
}
```

`isPresented` is controlled with the same acknowledgement and `revision` reset as
every other control, so refusing to set it back to true rolls the native state back,
and bumping `revision` closes an open dialog. Tapping a button dismisses the dialog
and fires both `onIsPresentedChange(false)` and `onAction` with that button's `id`.

`actions` needs at least one entry with unique `id` values. `role` is optional and
takes the same values as `Swift.Button`'s `buttonRole`. `title` and `message` are
plain strings; an empty `message` renders no message. `ConfirmationDialog` adds
`titleVisibility`: `automatic`, `visible`, or `hidden`.

Neither host takes a `disabled` prop. SwiftUI's `.disabled` propagates through the
environment into the presented content, so a host-level `disabled` would silently
disable every dialog button. Disable the control that opens the dialog instead.

The `presenting:` overloads that bind a value into the dialog, and
`presentationCompactAdaptation`, are not bound yet.

## Quick Look

`Swift.QuickLook` previews a local file with the system's Quick Look sheet. It is
SwiftUI's `quickLookPreview` from the `_QuickLook_SwiftUI` overlay module, and
like `Swift.Alert` it is a zero-size presentation host that takes no layout space.

```tsx
const [previewing, setPreviewing] = useState(false)
<Swift.QuickLook
  url={`file://${documentPath}`}
  isPresented={previewing}
  onIsPresentedChange={setPreviewing}
/>
```

The SDK binds the previewed item rather than a boolean, so a nil url is the
dismissed state: presenting hands Quick Look a url and a dismissal comes back as
nil. `url` must be a `file://` URL, which is what `expo-file-system` returns;
Quick Look previews local files and a remote url would silently preview nothing,
so the adapter rejects one.

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
selection, reordered pages with local state, and nested menus. Control, sheet, and
container fixtures live under `tests/native-features`. All nine simulator suites pass on
iOS 26.4, including rejected native changes, retained RN state in presented content,
and composed controls two containers deep. The package's build, typecheck, and test
scripts run from `packages/one-native`. See `tests/native-features/scripts/README.md`
for the conformance commands and their device/automation constraints.

## Native composition

`Swift.Host` renders One Native controls as one SwiftUI tree instead of one hosting
controller per control, and reports the height SwiftUI measured back to Yoga. It takes
no height of its own.

```tsx
<Swift.Host axis="vertical" spacing={12} alignment="leading">
  <Swift.Toggle label="Notifications" isOn={on} onIsOnChange={setOn} />
  <Swift.Stepper label="Servings" value={servings} onValueChange={setServings} />
  <Swift.Button label="Save" onPress={save} />
</Swift.Host>
```

`axis` is `vertical` or `horizontal`, `spacing` is the gap between children in points,
and `alignment` (`leading`, `center`, `trailing`) is the cross axis, so it places
children horizontally down a column and vertically across a row.

A composed child is still its own Fabric component, so its props, events, enum
validation and controlled state work exactly as they do standalone. What changes is
where it renders: the host publishes each child's SwiftUI content into its own tree and
never adds the child's UIView to the view hierarchy. A composed control therefore
activates when the host publishes it rather than when it gets a window, which is what
makes its events fire at all.

Two consequences worth knowing:

- React Native view props on a composed child land on a UIView nobody displays. A
  `testID`, `accessibilityLabel`, `backgroundColor` or `onLayout` on a composed
  `Swift.Toggle` has no effect. SwiftUI supplies the accessibility element instead, so
  the control is still reachable, under SwiftUI's own label. Put React Native props on
  the `Swift.Host` itself.
- A child's own `height` style is ignored. The host measures, so the layout comes from
  SwiftUI.

Children are One Native controls, One Native containers, and `Swift.Slot`, which is how
a React Native subtree gets into the SwiftUI tree.

Horizontal hosts hold whatever fits. Several SwiftUI controls are width-greedy, so
three of them side by side on a phone overflow, and SwiftUI then reports a much taller
ideal height. That is SwiftUI's layout for content that does not fit, not a
measurement error, but it means a horizontal host wants few children or explicit
widths.

### Forms and sections

`Swift.Form` is a SwiftUI `Form` and `Swift.Section` is a section inside one. They
compose children exactly the way a host does, and containers nest, so the React tree
describes the SwiftUI tree.

```tsx
<Swift.Form style={{ flex: 1 }}>
  <Swift.Section title="Details" footer="Shown under the rows">
    <Swift.Text text="Read only" />
    <Swift.Label label="Starred" systemImage="star.fill" />
    <Swift.Toggle label="Notify" isOn={on} onIsOnChange={setOn} />
  </Swift.Section>
  <Swift.Section title="More">
    <Swift.Button label="Save" onPress={save} />
  </Swift.Section>
</Swift.Form>
```

An empty `title` or `footer` omits that header or footer.

A `Form` is height-greedy and reports no ideal height, so it fills the box React Native
gives it: give it a height or a flex parent. That is also why a `Form` cannot be a child
of a `Swift.Host`. A host measures what it holds, SwiftUI answers zero for a form, and
the form then renders nothing at all; `Swift.Host` throws instead of rendering a blank.
A host inside a form or a section works, and so does a section inside a host.

### React Native inside the SwiftUI tree

`Swift.Slot` carries a React Native subtree into a container. SwiftUI proposes the box
and the subtree lays out inside it, so a slot takes an explicit `height`.

```tsx
<Swift.Form style={{ flex: 1 }}>
  <Swift.Section title="Details">
    <Swift.Toggle label="Notify" isOn={on} onIsOnChange={setOn} />
    <Swift.Slot height={44}>
      <Pressable onPress={save}>
        <Text>An ordinary React Native row</Text>
      </Pressable>
    </Swift.Slot>
  </Swift.Section>
</Swift.Form>
```

A slot fills the width its container offers. A horizontal host offers none, because an
`HStack` hands out its ideal width, so a slot in one takes an explicit `width` as well.

Inside the slot everything works as it does anywhere else in React Native: touches,
state, providers, and layout. A slot has to be a child of a container, so it throws when
it is used anywhere else.

### Popovers

`Swift.Popover` is both halves at once. Its children are the trigger, which composes
into SwiftUI and lays out inline like a host's content, and `content` is a React Native
subtree presented over the screen, like a sheet's.

```tsx
function ExamplePopover() {
  const [open, setOpen] = useState(false)
  return (
    <Swift.Popover
      isPresented={open}
      onIsPresentedChange={setOpen}
      presentationCompactAdaptation="popover"
      contentWidth={260}
      contentHeight={160}
      content={
        <View style={{ flex: 1, padding: 12 }}>
          <Text>Popover body</Text>
          <Pressable onPress={() => setOpen(false)}>
            <Text>Close</Text>
          </Pressable>
        </View>
      }
    >
      <Swift.Button label="Trigger" onPress={() => setOpen(true)} />
    </Swift.Popover>
  )
}
```

`isPresented` and `onIsPresentedChange` use the same controlled protocol as the sheet,
so a tap outside the popover reaches React as a change. SwiftUI sizes a popover from its
content and a React Native subtree has no ideal size, so `contentWidth` and
`contentHeight` are required. `arrowEdge` is an `Edge`; leaving it out takes SwiftUI's
own placement. `presentationCompactAdaptation` is a `PresentationAdaptation`, and its
default of `automatic` shows the body as a sheet on an iPhone; pass `popover` for a
popover there.

The trigger reports the height SwiftUI measured back to Yoga, exactly as `Swift.Host`
does, so never give a popover a height. A popover is a container, so it composes into a
form, a section or a host, and its trigger can be any One Native content.

The presented content carries its own touch handler, the same as sheet content, because
presentation leaves the React Native surface.

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
- typed leaf Swift and Objective-C++ hosts for pickers, form controls, buttons,
  indicators, and text input
- sheet types and a presented RN content slot
- an SDK manifest, input hashes, and unbound menu/tab modifier names
- `one-native/schema.json`, described below

It typechecks the assembled Swift at the minimum iOS version and runs the
controlled-state protocol probe. CI runs `generate:check`, TypeScript typecheck,
package tests, then a native-features consumer prebuild, `pod install`, and
xcodebuild. Normal package builds use the generated files and do not need to run
the generator.

`codegen/Extract.swift` uses the selected toolchain's SwiftParser and SwiftSyntax
to parse `.swiftinterface` files. `codegen/inventory.ts` feeds it every SwiftUI
interface in the SDK: SwiftUI, SwiftUICore, and each `_<Framework>_SwiftUI`
overlay module, which is where WebView, VideoPlayer, PhotosPicker, Map and
quickLookPreview live. `codegen/catalog.ts`
defines the supported constructor recipes and React-specific mappings, including
identity, child slots, and controlled events. Control recipes live in
`codegen/pickerCatalog.ts`, `codegen/formCatalog.ts`, `codegen/leafCatalog.ts`,
`codegen/mediaCatalog.ts`, and `codegen/textCatalog.ts`, and `codegen/emitControls.ts` turns each recipe into a
Swift host, an Objective-C++ adapter, a Fabric spec, public types, and a schema
entry.

### schema.json

`schema.json` is the machine-readable description of the native contract, at
version 2. Each component carries its Fabric name, its public component name, its
props and event payloads as `{ type, enum? }` entries, its controlled value and
event when it has one, its action events with the public prop that raises them,
its `layout` (`measured` for a control that reports the height SwiftUI measured,
`fill` for content with no ideal height that takes the box React Native gave it,
`container` for a host React Native lays out itself, or `presentation` for a
zero-size host), and its React Native slots. Top-level `enums` lists every
SwiftUI enum case with the iOS version that introduced it, and `eventDelivery`
records that React Native hands each payload to the component as
`onX({ nativeEvent: payload })`.

A browser or preview runtime implements the native contract, not the public one:
the public adapters in `src/generated/Controls.native.tsx` run unchanged on top,
so they still validate props, apply the controlled protocol, and supply the
default height. Soot resolves a Fabric host by its native view name through
`registerNativeComponentImplementation`, which is the seam this schema targets.

The schema does not yet carry accessibility role or label mapping, an executable
definition of the slot `layout` values, or any imperative ref, Fabric command, or
measurement contract. Those are real gaps for an independent implementation, not
oversights to infer around.

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
