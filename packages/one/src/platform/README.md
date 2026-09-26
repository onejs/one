# One native platform

The native side of `one`: SwiftUI, Jetpack Compose, UIKit, and Android interfaces for React Native.
The One Native iOS surface
exposes generated tabs, menus, pickers, form controls, sheets, full screen covers,
navigation stacks and toolbars, containers, popovers, video, maps, web views, sharing,
the photo library, empty states, and Quick Look through `Swift`. The package also retains
its platform colors, zoom, toolbar, menu action, and split view exports. The Swift surface
requires an iOS 17+ native build, and the Swift and Compose surfaces require React
Native's New Architecture. Beta releases are published to npm on the `beta` dist-tag.

Packaging: `src/specs` stays raw (pod-install codegen reads it), and the build
rewrites every dist spec mirror into a static view config identical to the
babel plugin's output, so no bundler needs to run a codegen transform.

The iOS floor is 17. API introduced later is availability-gated, never the
deployment target: modern tabs need iOS 18 (a legacy `TabView` renders below
it), `presentationSizing` needs iOS 18 and is ignored below it, and Liquid
Glass surfaces, `WebView`, `tabBarMinimizeBehavior`, the `glass` button
styles, and the `confirm`/`close` button roles need iOS 26. Enum values above
the runtime version throw a clear error from the adapter before reaching
native code; `WebView` renders empty below 26 and glass falls back to the
`material` surface, then to nothing.

## Android Compose

Android builds expose a small Jetpack Compose namespace beside `Swift`:
`One.Android.Column`, `One.Android.Row`, `One.Android.Box`, `One.Android.Text`, `One.Android.Button`,
`One.Android.Switch`, `One.Android.TextField`, `One.Android.Slider`, `One.Android.AlertDialog`,
`One.Android.Dialog`, and `One.Android.ProgressIndicator`. It requires an Android native
build.

```tsx
import { useState } from 'react'
import { One } from 'one'

function Settings() {
  const [enabled, setEnabled] = useState(true)
  return (
    <One.Android.Column
      style={{ flex: 1, width: '100%' }}
      horizontalAlignment="start"
      verticalArrangement="top"
      composeStyle={{ padding: 24, backgroundColor: '#FFFFFF' }}
    >
      <One.Android.Text
        text="Notifications"
        fontSize={20}
        fontWeight="bold"
        composeStyle={{ paddingBottom: 12 }}
      />
      <One.Android.Switch
        label="Allow notifications"
        isOn={enabled}
        onIsOnChange={setEnabled}
      />
      <One.Android.Button label="Save" onPress={() => save()} variant="filled" />
    </One.Android.Column>
  )
}
```

The root Compose node uses its React Native `style` for finite Yoga bounds. A root
without a finite width and height measures to zero because Compose descendants do not
participate in Yoga measurement.

Descendants are laid out by Compose, so a nested node must use `composeStyle` instead
of `style`. `composeStyle` is limited to colors, padding, width and height, fill flags,
corner radius, opacity, and border color and width. `Column` accepts
`horizontalAlignment`, `verticalArrangement`, and `spacing`; `Row` accepts
`verticalAlignment`, `horizontalArrangement`, and `spacing`. Explicit spacing
cannot be combined with a `spaceBetween`, `spaceAround`, or `spaceEvenly`
arrangement. `Box` accepts `contentAlignment`.

`Text` takes `text`, optional typography props and `maxLines`. `Button` takes `label`,
`disabled`, `variant` (`filled`, `outlined`, or `text`), and `tone` (`default` or
`danger`). `Switch` is controlled with `isOn`, `onIsOnChange`, and optional `revision`.

`Icon` renders a Material Symbols glyph. `name` is the snake_case Google icon name
(`star`, `arrow_forward`), checked against the codepoint map generated from
`codegen/material-symbols.codepoints`, so a typo throws when the icon renders
instead of drawing nothing. `size` defaults to 24 and is a dp box: it does not
scale with the system font size, matching the fixed 18dp Material 3 icon size a
`Button` uses. `filled` picks between the bundled outlined and filled static
fonts. `Button` takes the same `icon` and `iconFilled` and draws the glyph before
its label. Both fonts live in `android/src/main/res/font`, so rendering is
synchronous and offline. `composeStyle.foregroundColor` tints a standalone icon
the way it colors text; a Button icon follows the button's content color. An icon
with no `accessibilityLabel` is decorative, and one with a label announces as an
image.

`TextField` is controlled with `text`, `onTextChange`, and optional `revision`,
using the same acknowledgement protocol as `Switch`: keep the old text to reject
an edit, update it synchronously to accept. It takes `label`, `placeholder`,
`disabled`, `variant` (`filled` or `outlined`), `keyboardType` (`default`,
`number`, `decimal`, `email`, `password`, `phone`, or `url`), and `secureText`
for password masking.

`Slider` is controlled with `value`, `onValueChange`, and optional `revision`.
`minimumValue` and `maximumValue` default to 0 and 1 and must survive an
Android Float round trip; `step` defaults to 0 for a continuous slider,
otherwise it must evenly divide the range into at most 1001 intervals and the
native callback snaps to that grid. `value` must sit inside the bounds.

`AlertDialog` shows a Material alert while `visible` is true. `title` and
`message` are optional, `confirmLabel` is required, `dismissLabel` adds a second
button. `onConfirm` fires from the confirm button; `onDismiss` fires from the
dismiss button, an outside tap, or the system back button. React owns `visible`,
so both callbacks should usually hide the dialog. `Dialog` is the custom-content
form: while `visible`, its Compose children render inside a Material dialog
window, and `onDismiss` fires on outside tap or back press.

`ProgressIndicator` takes `variant` (`linear` or `circular`, default `circular`)
and optional `progress` from 0 to 1. Omit `progress` for an indeterminate spinner.

### Android toolchain pins and device proof

`android/build.gradle` pins the Compose toolchain with exact versions, not ranges:

| Artifact | Pinned | Resolved in `:app:assembleDebug` |
| --- | --- | --- |
| Compose UI / foundation | 1.11.4 | 1.11.4 |
| Material 3 | 1.4.0 | 1.4.0 (`material3-android`) |
| Kotlin Gradle plugin | host React Native project | 2.2.0 |
| AGP | React Native community template | 9.2.1 |
| Gradle | community template wrapper | 9.4.1 on Java 17 |
| compileSdk / targetSdk / minSdk | React Native community template | 37 / 36 / 24 |
| react-native / react | workspace | 0.87.1 / 19.2.3 |

The Compose versions above remain exact strings, so Gradle cannot silently
select a newer Compose release through a transitive range. The
`:app:dependencies` output is the gate: every `androidx.compose` line must
resolve to the pinned version.

To reproduce, from a clean checkout in `tests/native-features`:

```sh
bun install
bunx turbo run build --filter=one
bun run prebuild:native --platform android --no-install
cd android && ./gradlew :app:assembleDebug
```

The debug APK loads its bundle from Metro, so start `bun run dev`,
`adb reverse tcp:8081 tcp:8081`, install the APK, and run the proof:

```sh
bun tests/native-features/scripts/one-native-conformance.android.ts \
  --device-id <serial> --package-id dev.vxrn.nativefeatures.tests \
  --artifact-dir /tmp/one-native-android-proof
```

The suite preflights the attached device and the `tcp:8081` reverse before
running anything. When Metro listens on another port, pass
`--metro-port <PORT>` (or set `RCT_METRO_PORT`) to match the reverse.

The suite drives `tests/native-features/app/one-native-android.tsx` through
`uiautomator` dumps and coordinate taps: mount marker, accessibility and order,
prop mutation with fresh bounds, two button taps, controlled Switch reject,
accept, and revision reset, keyed reorder, optional unmount and remount,
disabled controls rejecting taps, Material Symbols icons rendering as their
codepoints with an outlined and a filled variant, an icon button tap, and a
decoy negative control. It then runs
a bounded stress block: six rapid unmount/remount toggles plus four rapid
reorders with a duplicate-node sweep over every proof testID, single-handler
taps proving no duplicate event delivery, and an orientation block that locks
landscape (orientation is in the activity's `configChanges`, so no recreate
occurs), proves the proof screen stays mounted with its taps-3 / switch-on
state intact and the fill-width button row remeasured wider, taps through one
live interaction, then frees the rotation lock and proves the screen stays
mounted with bounds reverted. A second screen then proves the TextField,
Slider, AlertDialog, Dialog, and ProgressIndicator nodes the same way. The
suite runs 46 checks on the standard emulator, plus 2 conditional
IME-renavigate checks.

Two behaviors are worth knowing when reading the artifacts. A non-scrollable
`Column` taller than the window keeps composing its tail, but the short
landscape edge leaves everything below the switch policy status out of the
uiautomator tree, so the landscape checks assert that observable prefix and
the full duplicate sweep runs again after rotating back. And process memory
across 24 optional-child remount cycles drifts up about 1.6% total (310.1MB to
315.3MB PSS, roughly 190KB per cycle with Native Heap holding two thirds of
the process); the run-to-run slope is unchanged, which is consistent with GC
laziness on a debug process and proves no rapid leak, but a short sample
cannot prove leak freedom.

```tsx
import { useState } from 'react'
import { Text, View } from 'react-native'
import type { ComponentProps } from 'react'
import { One } from 'one'

type MenuItem = ComponentProps<typeof One.iOS.Menu>['items'][number]

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
    <One.iOS.Tabs selection={selection} onSelectionChange={setSelection}>
      <One.iOS.Tab id="inbox" title="Inbox" systemImage="tray" badge="3">
        <View style={{ flex: 1, padding: 24 }}>
          <Text>Last action: {lastAction}</Text>
          <One.iOS.Menu
            accessibilityLabel="Message actions"
            items={actions}
            onAction={setLastAction}
          >
            <View style={{ padding: 16 }}>
              <Text>Actions</Text>
            </View>
          </One.iOS.Menu>
        </View>
      </One.iOS.Tab>
      <One.iOS.Tab id="settings" title="Settings" systemImage="gearshape">
        <Text>Ordinary React Native content goes here.</Text>
      </One.iOS.Tab>
    </One.iOS.Tabs>
  )
}
```

`One.iOS.Tabs` owns a SwiftUI `TabView` hosted by a Fabric component. It has no
React Navigation dependency. Each keyed page hosts ordinary RN views through
`UIViewRepresentable`, preserving the React tree and its providers. SwiftUI's
bounded page allocation updates Fabric state directly; Yoga lays out the RN
subtree inside those bounds.

Native taps update the visible tab immediately and emit a numbered selection
request. After `onSelectionChange` returns, the adapter acknowledges that request
with the current `selection`. Keeping the old selection rejects the tap. Update
selection synchronously in the callback to accept it; asynchronous decisions
should keep the old selection until ready. A newer pending tap ignores an older
acknowledgement.

Tabs require unique nonempty `id` values, a selection naming a mounted tab, and
direct `One.iOS.Tab` children (arrays and conditional children are supported).
One direct `One.iOS.Toolbar` may accompany the tabs. It attaches its items to the
TabView's own bar, so they share the system's vertical bar when the tab bar is
vertical.
Pages mount eagerly and keep their React state when switching tabs. Give the tabs
container bounded space, normally using `flex: 1` in a bounded parent.

A `One.iOS.Tab` with `onPress` and no children is an action tab: pressing it runs the action
and the selection does not move. It never reaches the controlled protocol, so there is no
optimistic selection to undo and no flash of an empty page. Every tab needs exactly one of
`onPress` and `children`, and the selection may not name an action tab.

Add `role="search"` to detach it from the main tab bar pill. On iOS 18+ the search role is
what moves a tab into its own capsule on the trailing side; iOS 27 adds `role="prominent"`.
A role below its runtime version throws from the adapter; on iOS 17 tabs render through the
legacy `TabView`, which has no roles.

```tsx
<One.iOS.Tab
  id="compose"
  title="Compose"
  systemImage="plus"
  role="search"
  onPress={openComposer}
/>
```

`One.iOS.Menu` renders actual SwiftUI `Menu`, `Button`, `Toggle`, `Section`,
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

`One.iOS.Tabs` covers SwiftUI's TabView surface. Every prop mirrors the SwiftUI name and
takes the SDK's own values; unsupported values, and values above the runtime iOS version,
are rejected before submitting native props.

| SwiftUI | One |
| --- | --- |
| `TabView(selection:)` | `selection`, `onSelectionChange` |
| `tabViewStyle` | `tabViewStyle`: `automatic`, `tabBarOnly`, `sidebarAdaptable`, `page` |
| `Tab(_:systemImage:/image:value:role:)` | `One.iOS.Tab` `title`, `systemImage` or `image`, `role` |
| `badge` | `badge` (string or number) |
| `TabSection`, `sectionActions`, `defaultSectionExpansion` | `One.iOS.TabSection` `title`, `sectionActions` (`{ id, title, systemImage, onPress }[]`), `defaultSectionExpansion` |
| TabContent `disabled`, `hidden`, `customizationID`, `customizationBehavior(_:for:)`, `defaultVisibility(_:for:)`, `tabPlacement`, `springLoadingBehavior`, `accessibilityLabel/Hint/Value/Identifier`, `help` | same-named props on `One.iOS.Tab` and `One.iOS.TabSection`; the placement forms take `{ behavior or visibility, for: [...] }` |
| `tabViewCustomization(_:)` | `customization` (the `TabViewCustomization` JSON) and `onCustomizationChange` |
| `tabViewBottomAccessory(isEnabled:)` and its placement | `One.iOS.TabViewBottomAccessory` `isEnabled`, `inline`, `expanded` |
| `tabViewSidebarHeader`, `Footer`, `BottomBar` | `One.iOS.TabViewSlot` |
| `toolbarVisibility(_:for: .tabBar)` | `tabBarVisibility` |
| `tabBarMinimizeBehavior`, `tabViewSearchActivation`, `defaultTabBarPlacement`, `tint` and every other scalar View modifier | `swiftStyle` |
| View modifiers on a tab's content, such as `ignoresSafeArea(_:edges:)` | `One.iOS.Tab` `swiftStyle` |

```tsx
<One.iOS.Tabs
  selection={selection}
  onSelectionChange={setSelection}
  tabViewStyle="sidebarAdaptable"
  swiftStyle={{ tabBarMinimizeBehavior: 'onScrollDown' }}
>
  <One.iOS.Tab id="home" title="Home" systemImage="house">...</One.iOS.Tab>
  <One.iOS.TabSection id="library" title="Library" sectionActions={[{ id: 'add', title: 'Add', systemImage: 'plus', onPress: add }]}>
    <One.iOS.Tab id="songs" title="Songs" systemImage="music.note" customizationID="songs">...</One.iOS.Tab>
  </One.iOS.TabSection>
  <One.iOS.Tab id="search" title="Search" systemImage="magnifyingglass" role="search">...</One.iOS.Tab>
  <One.iOS.TabViewBottomAccessory>...</One.iOS.TabViewBottomAccessory>
  <One.iOS.Toolbar>
    <One.iOS.ToolbarItem placement="topBarTrailing">
      <One.iOS.Button label="Reload" systemImage="arrow.clockwise" onPress={reload} />
    </One.iOS.ToolbarItem>
  </One.iOS.Toolbar>
</One.iOS.Tabs>
```

On a foldable (measured on the iOS 27.1 iPhone Duo simulator with
`tests/native-features/app/one-native-tabview.tsx`), SwiftUI places the bar
and the app has nothing to decide:

- Closed, Open landscape and Book show a vertical bar on the trailing edge; Open
  portrait shows the horizontal bar. `sidebarAdaptable` never becomes a sidebar
  there, so a two-pane layout on the open device is the app's own split.
- The bottom accessory stays horizontal at the bottom beside a vertical bar, and
  in Book it keeps to the leading half, clear of the fold.
- `tabBarMinimizeBehavior` minimizes the horizontal bar when a React Native
  `ScrollView` page scrolls, with no extra wiring; the vertical bar does not
  minimize.
- A page's React Native content already sits inside the vertical bar's inset.

`One.iOS.Pager` is a tab bar without the bar: keyed React Native pages under the
same controlled `selection`, swiped rather than tapped, with the page dots
SwiftUI draws for the page style. Pages reuse the `Tab` component, so they
mount through the same slot machinery; a page carries only an `id`, since tab
chrome has nothing to attach to.

```tsx
<One.iOS.Pager selection={page} onSelectionChange={setPage}>
  <One.iOS.Page id="a">
    <Text>Page A</Text>
  </One.iOS.Page>
  <One.iOS.Page id="b">
    <Text>Page B</Text>
  </One.iOS.Page>
</One.iOS.Pager>
```

Like a tab bar, a pager takes the box it is given, so it needs its own box
rather than a seat inside a `One.iOS.Host` or `One.iOS.ZStack`.

The menu's children supply its visual trigger. The SwiftUI menu owns that
trigger's interaction and accessibility label; use a `View` or any React Native layout
as its content. Put independent interactive controls outside the trigger.

`One.iOS.ContextMenu` takes the same `items` and the same callbacks, and presents them on
SwiftUI's other menu presentation: a long press on its children rather than a tap. Menu
and context menu are one native component, so everything the menu supports, including
toggles, submenus, sections and `menuActionDismissBehavior`, works identically here.

```tsx
<One.iOS.ContextMenu items={actions} onAction={setLastAction}>
  <Pressable onPress={open}>
    <Text>Long press for actions</Text>
  </Pressable>
</One.iOS.ContextMenu>
```

The difference is the trigger. A menu owns the tap, so its trigger is passive and
SwiftUI supplies its accessibility label. A context menu only claims the long press, so
its children keep their own touches and their own accessibility, which is why
`accessibilityLabel` is optional here and is not applied to the subject. `preview:` is
not bound: a context menu renders its subject as its own preview.

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
      <One.iOS.Picker
        label="Letter"
        selection={letter}
        onSelectionChange={setLetter}
        options={[
          { value: 'alpha', label: 'Alpha' },
          { value: 'beta', label: 'Beta' },
        ]}
        pickerStyle="menu"
      />
      <One.iOS.DatePicker
        label="Appointment"
        selection={when}
        onSelectionChange={setWhen}
        minimumDate={new Date('2026-01-01T00:00:00Z')}
        maximumDate={new Date('2026-12-31T23:59:59Z')}
        displayedComponents="date"
        datePickerStyle="compact"
      />
      <One.iOS.ColorPicker
        label="Accent"
        selection={color}
        onSelectionChange={setColor}
        supportsOpacity
      />
      <One.iOS.Toggle label="Notifications" isOn={enabled} onIsOnChange={setEnabled} />
      <One.iOS.Slider
        label="Volume"
        value={volume}
        onValueChange={setVolume}
        minimumValue={0}
        maximumValue={100}
        step={5}
      />
      <One.iOS.Stepper
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
`systemImage` is an optional SF Symbol shown beside the label through SwiftUI's
`Toggle(_:systemImage:isOn:)`; an omitted image keeps the text-only toggle.

`Slider` and `Stepper` take finite `value`, `minimumValue`, `maximumValue`, and
`step` numbers. `minimumValue` must be less than `maximumValue`, `step` must be
greater than 0, and `value` must sit in that range. Defaults are 0, 100, and 1.

`Slider` takes text at each end of the track with `minimumValueLabel` and
`maximumValueLabel`, and SF Symbol names there with `minimumValueImage` and
`maximumValueImage`. An image wins over a label on the same side. A slider that
sets none of the four keeps SwiftUI's label-free slider.

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
      <One.iOS.Text text="Read only" />
      <One.iOS.Label label="Starred" systemImage="star.fill" />
      <One.iOS.Image
        systemName="star.fill"
        symbolRenderingMode="hierarchical"
        imageScale="medium"
      />
      <One.iOS.Button
        label="Delete"
        systemImage="trash"
        buttonRole="destructive"
        buttonStyle="bordered"
        onPress={() => remove()}
      />
      <One.iOS.ProgressView label="Uploading" value={0.4} total={1} />
      <One.iOS.ProgressView label="Working" progressViewStyle="circular" />
      <One.iOS.Gauge
        label="Speed"
        value={72}
        minimumValue={0}
        maximumValue={120}
        currentValueLabel="72"
        minimumValueLabel="0"
        maximumValueLabel="120"
        gaugeStyle="accessoryCircular"
      />
      <One.iOS.TextField
        label="Name"
        prompt="Your name"
        text={name}
        onTextChange={setName}
        submitLabel="done"
        onSubmit={() => save(name)}
      />
      <One.iOS.SecureField label="Password" text={secret} onTextChange={setSecret} />
    </View>
  )
}
```

`Text` renders its `text` verbatim, so it never looks up a localized string. `Label`
pairs a `label` with a required `systemImage` SF Symbol and localizes the label the way
SwiftUI does. `Image` renders an SF Symbol with `systemName`, optional `symbolRenderingMode`,
`symbolVariant`, `imageScale`, and `variableValue`, or a remote image with `uri` (exactly one of
the two). A `uri` image loads into `Image(uiImage:)`, fills the frame `swiftStyle` gives it, and
keeps its own colors, so as a `Button`'s label in a toolbar it becomes the bar item's image: the
iPhone Duo's edge dock takes it into the item's pill, where `AsyncImage` would stay page content.
`renderingMode: 'template'` draws it as a template instead, so an app asset glyph takes the
bar's tint like an SF Symbol.
All three are display only: they have no events and no controlled value, and they are most useful
as rows inside a container.

`Button` needs a `label`, a `systemImage`, or children. With only a `systemImage` it
renders the bare symbol with no title spacing reserved, centered in the button
frame. With children, the children are the label view (`Button(action:) { label }`)
and the `label`, `systemImage`, and `subtitle` props must be omitted; passing both
is a validation error. `Text` stays text-only and never takes children. `buttonRole`
is `destructive`, `cancel`, `confirm`, `close`, or empty for none; it is named
`buttonRole` because React Native's `ViewProps` already owns `role` for the
accessibility role. `confirm` and `close` need iOS 26. `buttonStyle` is
`automatic`, `plain`, `borderless`, `bordered`, `borderedProminent`, `glass`,
or `glassProminent`; the two `glass` styles need iOS 26. Values above the
runtime version throw from the adapter. `onPress` does
not fire while `disabled`. `disclosureIndicator` shapes the button as the row iOS uses
for something that opens: the label, a `Spacer`, and a trailing secondary chevron,
filling the width the button is given. It is what makes a `Button` inside a `One.iOS.Form`
read as "Change flight >".

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

Programmatic focus is controlled through `focused` and `onFocusChange` using the shared
controlled protocol, mapped to SwiftUI's `@FocusState`. `keyboardType` sets UIKit's
`UIKeyboardType` (`default`, `numberPad`, `decimalPad`, `emailAddress`, etc.) and `textContentType`
configures semantic text content.

## Shapes

`Circle`, `Capsule`, `Rectangle`, `RoundedRectangle`, and `Ellipse` are SwiftUI's
shapes, one control each, named as SwiftUI names them. A shape has no ideal size
of its own, so it takes the `width` and `height` React Native gives it, and `fill`
paints it with a color. An omitted `fill` keeps SwiftUI's own default rendering.
`RoundedRectangle` also takes `cornerRadius`, which must be a non-negative number.
The set matches the `shape` values `One.iOS.Glass` accepts, lowercased
(`circle`, `capsule`, `rectangle`, `roundedRectangle`, `ellipse`).

```tsx
function Dots() {
  return (
    <View style={{ flexDirection: 'row' }}>
      <One.iOS.Circle fill="red" style={{ width: 12, height: 12 }} />
      <One.iOS.RoundedRectangle
        fill="blue"
        cornerRadius={4}
        style={{ width: 24, height: 12 }}
      />
    </View>
  )
}
```

## Video

`One.iOS.VideoPlayer` is SwiftUI's `VideoPlayer` from the `_AVKit_SwiftUI` overlay
module. Video has no ideal height to report, so unlike every other control it
takes the box React Native gives it: size it with `style`.

```tsx
<One.iOS.VideoPlayer
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

`One.iOS.Map` is SwiftUI's `Map` from the `_MapKit_SwiftUI` overlay module. Like
video it has no ideal height to report, so it takes the box React Native gives
it: size it with `style`.

```tsx
<One.iOS.Map
  latitude={37.7955}
  longitude={-122.3937}
  distance={4000}
  markers={[{ id: 'coit', label: 'Coit Tower', latitude: 37.8024, longitude: -122.4058 }]}
  style={{ width: '100%', height: 220 }}
  onRegionChange={(latitude, longitude, distance) =>
    setCamera({ latitude, longitude, distance })
  }
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

## Web content

`One.iOS.WebView` is SwiftUI's `WebView` from the `_WebKit_SwiftUI` overlay module. It is
iOS 26 API, so below 26 it renders empty rather than raising the package floor. Like video
and maps it has no ideal height, so it takes the box React Native gives it.

```tsx
<One.iOS.WebView
  url="https://onestack.dev"
  style={{ width: '100%', height: 320 }}
  onNavigate={setAddress}
  onTitleChange={setTitle}
  onLoadingChange={(loading, progress) => setProgress(loading ? progress : 1)}
/>
```

Behind it is a `WebPage`, WebKit's observable page state, which is what makes the current
url, the title and the load progress readable from React. `onNavigate` fires whenever the
page's url changes, including redirects and in-page navigation, so it is where an OAuth
redirect is caught. `onLoadingChange` carries both the loading flag and
`estimatedProgress`; WebKit coalesces its own progress reporting, so it is not a
per-frame event.

Pass `html` instead of `url` to render markup the app already holds rather than something
it fetches. Exactly one of the two is required; passing both, or neither, throws.

The source is loaded once per value, whichever of the two it is. Changing any other prop
does not reload, because a reload would throw away the scroll position and the
back-forward list.

`backForwardNavigationGestures`, `magnificationGestures`, `linkPreviews`,
`elementFullscreen` and `contentBackground` are the SDK's own `webView*` modifiers; each
is `automatic`, `enabled` or `disabled` (`contentBackground` is a `Visibility`), and an
omitted value leaves SwiftUI's default in place.

There is no imperative surface: no `goBack`, `reload`, `stopLoading` or JavaScript
evaluation. Those are commands rather than props, and this package has no command
mechanism. Text selection (`webViewTextSelection`) and the scroll modifiers are not bound
either.

## Sharing and the photo library

`One.iOS.ShareLink` is the system share sheet, which is `UIActivityViewController` and has
no React Native equivalent that looks right. It renders as a button you label yourself.

```tsx
<One.iOS.ShareLink
  label="Share"
  systemImage="square.and.arrow.up"
  item="https://onestack.dev"
  itemType="url"
  subject="One"
  message="Worth a look"
/>
```

`item` is one string and `itemType` says how to share it, because the SDK takes a link
and a piece of text through different initializers. `subject` and `message` are optional
and empty means unset. A url that does not parse falls back to sharing the text.

`One.iOS.PhotosPicker` is SwiftUI's `PhotosPicker` from the `_PhotosUI_SwiftUI` overlay
module. It renders as a button and presents Apple's photo picker, which runs out of
process and needs no photo library permission prompt.

```tsx
<One.iOS.PhotosPicker
  label="Choose photos"
  systemImage="photo.on.rectangle"
  filter="images"
  maxSelectionCount={3}
  onPick={(url, index, count) => addPicked(url, index, count)}
  onPickError={setPickError}
/>
```

The picker hands back a `PhotosPickerItem`, which is a promise of data rather than a
file, so each item is loaded asynchronously and written into the temporary directory.
`onPick` fires once per item with the `file://` url, the index that item held in the
selection, and how many were picked; loads finish out of order, which is why the index is
in the payload. Collect a multiple selection from those three values. `onPickError`
reports a load that failed. Nothing deletes the written files; the system clears the
temporary directory.

`maxSelectionCount` defaults to 1 and 0 means unlimited. `filter` restricts what the
picker offers (`images`, `videos`, `livePhotos`, `screenshots`, `screenRecordings`,
`slomoVideos`, `timelapseVideos`, `cinematicVideos`, `depthEffectPhotos`, `bursts`,
`panoramas`, or `any`). `selectionBehavior` and `preferredItemEncoding` are the SDK's own
enums.

## Empty states

`One.iOS.ContentUnavailableView` is Apple's empty state, the view a search with no results
or an empty inbox uses. Like video and maps it fills the box React Native gives it,
because an empty state is given an area rather than a row height.

```tsx
<One.iOS.ContentUnavailableView
  title="No messages"
  systemImage="tray"
  description="New messages will appear here."
  actions={[{ id: 'refresh', label: 'Refresh' }]}
  onAction={refresh}
  style={{ flex: 1 }}
/>
```

`actions` is the same id-reporting button list the dialogs carry, and it may be empty.
Ids must be unique. `description` and `systemImage` are optional.

## Alerts and confirmation dialogs

`One.iOS.Alert` and `One.iOS.ConfirmationDialog` are zero-size presentation hosts, like
`One.iOS.Sheet`: they take no layout space and present over the app. Their buttons are
data, not children, because SwiftUI builds them inside the presented dialog where a
React Native subtree cannot go.

```tsx
function DeleteButton({ item }: { item: Item }) {
  const [confirming, setConfirming] = useState(false)
  return (
    <View>
      <One.iOS.Button label="Delete" onPress={() => setConfirming(true)} />
      <One.iOS.Alert
        title="Delete item?"
        message="This cannot be undone."
        presenting={item.id}
        isPresented={confirming}
        onIsPresentedChange={setConfirming}
        actions={[
          { id: 'cancel', label: 'Cancel', role: 'cancel' },
          { id: 'delete', label: 'Delete', role: 'destructive' },
        ]}
        onAction={(id, itemId) => id === 'delete' && removeById(itemId)}
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
takes the same values as `One.iOS.Button`'s `buttonRole`. `title` and `message` are
plain strings; an empty `message` renders no message. `ConfirmationDialog` adds
`titleVisibility`: `automatic`, `visible`, or `hidden`.

Pass `presenting` when an action needs the value captured for that presentation.
The action callback receives `(id, presenting)`, and an empty string is a valid
presented value. Leaving the prop out uses the ordinary boolean overload and reports
an empty second callback argument for compatibility with the shared event shape.

Neither host takes a `disabled` prop. SwiftUI's `.disabled` propagates through the
environment into the presented content, so a host-level `disabled` would silently
disable every dialog button. Disable the control that opens the dialog instead.

## Quick Look

`One.iOS.QuickLook` previews a local file with the system's Quick Look sheet. It is
SwiftUI's `quickLookPreview` from the `_QuickLook_SwiftUI` overlay module, and
like `One.iOS.Alert` it is a zero-size presentation host that takes no layout space.

```tsx
const [previewing, setPreviewing] = useState(false)
<One.iOS.QuickLook
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

`One.iOS.Sheet` presents its React Native children in a SwiftUI sheet. The host has
zero width and height and does not take layout space. Keep the sheet mounted while
it can present. Children stay in the React tree when dismissed, so local RN state
is retained.

```tsx
function ExampleSheet() {
  const [open, setOpen] = useState(false)
  const [nested, setNested] = useState(false)
  const [dismisses, setDismisses] = useState(0)
  const [detent, setDetent] = useState<PresentationDetent>('medium')
  return (
    <>
      <Text>Dismisses: {dismisses}</Text>
      <One.iOS.Sheet
        isPresented={open}
        onIsPresentedChange={setOpen}
        onDismiss={() => setDismisses((count) => count + 1)}
        presentationDetents={['medium', 'large']}
        selectedDetent={detent}
        onSelectedDetentChange={setDetent}
        presentationDragIndicator="automatic"
        presentationBackground="#FFF3C4"
        presentationBackgroundInteraction={{ enabledUpThrough: 'medium' }}
        presentationContentInteraction="resizes"
        presentationSizing="automatic"
        interactiveDismissDisabled={false}
      >
        <View style={{ flex: 1, padding: 16 }}>
          <Text>Sheet body</Text>
          <One.iOS.Sheet isPresented={nested} onIsPresentedChange={setNested}>
            <View style={{ flex: 1, padding: 16 }}>
              <Text>Nested sheet</Text>
            </View>
          </One.iOS.Sheet>
        </View>
      </One.iOS.Sheet>
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

`selectedDetent` and `onSelectedDetentChange` form a controlled pair. The selection
must be present in `presentationDetents`; native drags are acknowledged with the same
event-count and `detentRevision` protocol used by other controlled values.
`presentationBackground` accepts a React Native color. Background interaction is
`automatic`, `enabled`, `disabled`, or `{ enabledUpThrough: detent }`. Content
interaction is `automatic`, `resizes`, or `scrolls`. Presentation sizing is
`automatic`, `fitted`, `form`, or `page`; it needs iOS 18 and is ignored below it.

`fitToContents` derives a height detent from the mounted React Native child's laid-out
height. Use a fixed or intrinsically sized outer child and do not give it `flex: 1`;
a flexible child asks to fill the provisional sheet and therefore has no smaller
content height to fit. Fit mode owns its detent, so it cannot be combined with
`selectedDetent` or an `enabledUpThrough` background interaction.

Presented sheet content reports Fabric slot state with a local origin. The content
host supplies a touch handler because presentation leaves the RN surface, the same
situation as React Native's `Modal`. If that content uses
`react-native-gesture-handler`, wrap it in `GestureHandlerRootView` as you would
inside `Modal`. `one` does not add that package.

A `One.iOS.Sheet` inside presented children presents a nested sheet.

`One.iOS.FullScreenCover` is the same presentation with different chrome: it covers the
screen, has no detents and no drag indicator, and is not dismissed by a swipe. It is the
same native component as `One.iOS.Sheet`, so the presented slot, the controlled protocol
and `onDismiss` behave identically; only the presenting modifier differs.

```tsx
<One.iOS.FullScreenCover isPresented={open} onIsPresentedChange={setOpen}>
  <View style={{ flex: 1, padding: 16 }}>
    <Text>Covering content</Text>
    <Button title="Close" onPress={() => setOpen(false)} />
  </View>
</One.iOS.FullScreenCover>
```

Because nothing dismisses a cover from the outside, the presented content must supply its
own way out, or React must set `isPresented` back to false.

## Navigation stacks and toolbars

`One.iOS.NavigationStack` is a real SwiftUI `NavigationStack` whose root is the React Native
content beside it, and `One.iOS.Toolbar` fills its navigation bar with real SwiftUI toolbar
content. A `One.iOS.Toolbar` directly under `One.iOS.Tabs` attaches to the TabView instead.
Use the container whose bar owns the actions.

```tsx
function Mailbox() {
  const [page, setPage] = useState('inbox')
  const [open, setOpen] = useState(false)
  return (
    <One.iOS.Sheet isPresented={open} onIsPresentedChange={setOpen}>
      <One.iOS.NavigationStack
        style={{ flex: 1 }}
        swiftStyle={{
          navigationTitleWithText: 'Mailbox',
          navigationBarTitleDisplayMode: 'inline',
        }}
      >
        <One.iOS.Toolbar>
          <One.iOS.ToolbarItem placement="principal">
            <One.iOS.Picker
              label="Mailbox"
              pickerStyle="segmented"
              selection={page}
              onSelectionChange={setPage}
              options={[
                { value: 'inbox', label: 'Inbox' },
                { value: 'archive', label: 'Archive' },
              ]}
            />
          </One.iOS.ToolbarItem>
          <One.iOS.ToolbarItem placement="topBarTrailing">
            <One.iOS.Button
              label="Close"
              systemImage="xmark"
              buttonRole="close"
              onPress={() => setOpen(false)}
            />
          </One.iOS.ToolbarItem>
        </One.iOS.Toolbar>
        <View style={{ flex: 1, padding: 24 }}>
          <Text>{page === 'inbox' ? 'Inbox' : 'Archive'}</Text>
        </View>
      </One.iOS.NavigationStack>
    </One.iOS.Sheet>
  )
}
```

A stack takes the box React Native gives it, so give it a height or a flex parent. Its
React Native children are the stack's root: SwiftUI proposes that box and Yoga lays the
subtree out inside it, the same contract a `One.iOS.Tab` page follows. `One.iOS.Toolbar`
elements are read by the stack and never render where they are written, so they are
direct children beside the content rather than inside it. Tabs accepts one direct
toolbar; a toolbar written outside either container is an error rather than a silent
no-op. More than one stack toolbar merges in declaration order.

Toolbar items are SwiftUI content: a `One.iOS.ToolbarItem` holds One Native controls,
containers, or a `One.iOS.Slot` for a React Native subtree, exactly like any other
container. A composed control keeps its controlled protocol there, so the segmented
`Picker` above reports its selection the same way it does standalone.

`placement` is `ToolbarItemPlacement`, and every case the SDK ships on iOS is accepted:
`automatic`, `principal`, `navigation`, `primaryAction`, `secondaryAction`, `status`,
`confirmationAction`, `cancellationAction`, `destructiveAction`, `keyboard`,
`topBarLeading`, `topBarTrailing`, `topBarPinnedTrailing`, the soft-deprecated
`navigationBarLeading` and `navigationBarTrailing`, `title`, `largeTitle`, `subtitle`,
`largeSubtitle`, and `bottomBar`. A placement the running iOS version does not have
throws before a native prop carries it, which is `topBarPinnedTrailing` below iOS 27 and
`largeTitle`, `subtitle`, and `largeSubtitle` below iOS 26.

`One.iOS.ToolbarItemGroup` is SwiftUI's `ToolbarItemGroup`, with the same `placement` and
composed children. Add `label` and an optional `systemImage` for the SDK's labelled group
initializer, which renders the label the way a menu-style group does.

`One.iOS.ToolbarSpacer` is SwiftUI's `ToolbarSpacer`, which is iOS 26 and later. `sizing` is
`flexible` (the default) or `fixed`, and it takes the same `placement`. It holds no
children.

The bar itself is configured through `swiftStyle`, because every navigation and toolbar
modifier SwiftUI declares as a scalar is derived into it: `navigationTitleWithText`
(`navigationTitle(_: Text)`), `navigationTitleWithBindingString` for the `Binding<String>`
overload, `navigationBarTitleDisplayMode`, `navigationSubtitle`, `toolbarRole`,
`toolbarTitleDisplayMode`, `toolbarVisibility`, `toolbarBackground`,
`toolbarBackgroundVisibility`, `toolbarColorScheme`, `toolbarMinimizationBehavior`,
`toolbarMinimizationRestoration`, `toolbarMinimizationSafeAreaAdjustment`,
`toolbarWithRemoving`, `navigationBarHidden`, `navigationBarBackButtonHidden`, and the
rest of the generated modifier set. `ToolbarItem` and `ToolbarItemGroup` take
`swiftStyle` too, applied to their content.

The stack is the bar and the content, not a navigation path: `path`, `navigationDestination`
and `NavigationLink` are not bound, so pushing and popping screens is still React's.
Customizable toolbars are not bound either: `ToolbarItem(id:)`, `toolbar(id:)`,
`defaultCustomization`, and `toolbarCustomizationBehavior` need a toolbar customization
protocol the way `One.iOS.Tabs` carries `TabViewCustomization`.

Depend on `one` and rebuild the app after installing pods. `tests/native-features/app/one-native.tsx` exercises
selection, reordered pages with local state, and nested menus. Control, sheet, and
container fixtures live under `tests/native-features`, and
`tests/native-features/app/one-native-navigation.tsx` is the navigation stack fixture: a
sheet whose `One.iOS.NavigationStack` puts a segmented principal `Picker` and a trailing
close in the bar over two React Native pages. Its `navigation` conformance suite passes on
an iPhone 17 Pro with iOS 27, alongside the simulator suites that pass on iOS 26.4. The
build, typecheck, and test scripts run from `packages/one`. See
`tests/native-features/scripts/README.md` for the conformance commands and their
device/automation constraints.

## Native composition

`One.iOS.Host` renders One Native controls as one SwiftUI tree instead of one hosting
controller per control, and reports the height SwiftUI measured back to Yoga. It takes
no height of its own.

```tsx
<One.iOS.Host axis="vertical" spacing={12} alignment="leading">
  <One.iOS.Toggle label="Notifications" isOn={on} onIsOnChange={setOn} />
  <One.iOS.Stepper label="Servings" value={servings} onValueChange={setServings} />
  <One.iOS.Button label="Save" onPress={save} />
</One.iOS.Host>
```

`axis` is `vertical` or `horizontal`, `spacing` is the gap between children in points,
and `alignment` (`leading`, `center`, `trailing`) is the cross axis, so it places
children horizontally down a column and vertically across a row.

`One.iOS.HStack` and `One.iOS.VStack` are that host with the axis fixed, so a row is
`<One.iOS.HStack spacing={8} alignment="center">` and a column is
`<One.iOS.VStack spacing={8} alignment="leading">`. Neither takes an `axis`.

A composed child is still its own Fabric component, so its props, events, enum
validation and controlled state work exactly as they do standalone. What changes is
where it renders: the host publishes each child's SwiftUI content into its own tree and
never adds the child's UIView to the view hierarchy. A composed control therefore
activates when the host publishes it rather than when it gets a window, which is what
makes its events fire at all.

Two consequences worth knowing:

- React Native view props on a composed child land on a UIView nobody displays. A
  `testID`, `accessibilityLabel`, `backgroundColor` or `onLayout` on a composed
  `One.iOS.Toggle` has no effect. SwiftUI supplies the accessibility element instead, so
  the control is still reachable, under SwiftUI's own label. Put React Native props on
  the `One.iOS.Host` itself.
- A child's own `height` style is ignored. The host measures, so the layout comes from
  SwiftUI.

Children are One Native controls, One Native containers, and `One.iOS.Slot`, which is how
a React Native subtree gets into the SwiftUI tree.

`One.iOS.Host` and `One.iOS.Form` can override the SwiftUI environment for their entire
composed subtree with `colorScheme`, `dynamicTypeSize`, `controlSize`, `locale`,
`tint`, and `isEnabled`. `controlSize` is `mini`, `small`, `regular`, `large`, or
`extraLarge`, and sizes the controls in the subtree the way SwiftUI's
`.controlSize(_:)` does. Omitted props preserve values inherited from an outer
SwiftUI container.
This set covers the environment values React Native can express as stable scalar or
color props and that directly affect appearance, text layout, localization, and
interaction. Arbitrary environment keys are intentionally excluded because their
value types cannot cross React Native codegen safely, and adding named keys without a
concrete One Native consumer would create unused API surface.

Horizontal hosts hold whatever fits. Several SwiftUI controls are width-greedy, so
three of them side by side on a phone overflow, and SwiftUI then reports a much taller
ideal height. That is SwiftUI's layout for content that does not fit, not a
measurement error, but it means a horizontal host wants few children or explicit
widths.

### Overlays and spacers

`One.iOS.ZStack` lays its children over one another instead of in a line, and sizes itself
to the largest of them. `alignment` says where the smaller ones sit: `center` by
default, or `topLeading`, `top`, `topTrailing`, `leading`, `trailing`, `bottomLeading`,
`bottom`, `bottomTrailing`.

```tsx
<One.iOS.ZStack alignment="bottomTrailing">
  <One.iOS.Image systemName="photo" />
  <One.iOS.Label label="Draft" systemImage="pencil" />
</One.iOS.ZStack>
```

Like a host, a ZStack reports the height SwiftUI measured back to Yoga, so it works
standalone or composed into a form, a section, a stack, or another ZStack.

`One.iOS.Spacer` takes the free space its stack offers, which pushes its siblings apart.
It has to be inside a container, and it only has space to take where the stack is given
more than its content asks for: across a `One.iOS.HStack` that is the width of the row,
while a vertical stack reports its own ideal height and leaves a spacer at `minLength`,
0 by default.

```tsx
<One.iOS.HStack>
  <One.iOS.Label label="Change flight" systemImage="airplane" />
  <One.iOS.Spacer />
  <One.iOS.Button label="Edit" onPress={edit} />
</One.iOS.HStack>
```

### Forms and sections

`One.iOS.Form` is a SwiftUI `Form` and `One.iOS.Section` is a section inside one. They
compose children exactly the way a host does, and containers nest, so the React tree
describes the SwiftUI tree.

```tsx
<One.iOS.Form style={{ flex: 1 }}>
  <One.iOS.Section title="Details" footer="Shown under the rows">
    <One.iOS.Text text="Read only" />
    <One.iOS.Label label="Starred" systemImage="star.fill" />
    <One.iOS.Toggle label="Notify" isOn={on} onIsOnChange={setOn} />
  </One.iOS.Section>
  <One.iOS.Section title="More">
    <One.iOS.Button label="Save" onPress={save} />
  </One.iOS.Section>
</One.iOS.Form>
```

An empty `title` or `footer` omits that header or footer.

### Lists and scroll views

`One.iOS.List` is a SwiftUI `List`. It holds rows directly or in `One.iOS.Section`
groups, takes the box React Native gives it, and styles itself with the
SDK-derived `listStyle`: `automatic` (the default), `plain`, `grouped`,
`inset`, `insetGrouped`, or `sidebar`.

```tsx
<One.iOS.List listStyle="insetGrouped" style={{ flex: 1 }}>
  <One.iOS.Section title="Fruits">
    <One.iOS.Text text="Apple" />
    <One.iOS.Toggle label="Ripe" isOn={ripe} onIsOnChange={setRipe} />
  </One.iOS.Section>
  <One.iOS.Section title="Vegetables">
    <One.iOS.Text text="Carrot" />
  </One.iOS.Section>
</One.iOS.List>
```

Like a form, a list is greedy: it fills its box rather than reporting an ideal
height, so it cannot be a child of a `One.iOS.Host` or `One.iOS.ZStack` either.

`One.iOS.ScrollView` scrolls One Native content vertically by default,
horizontally with `axes="horizontal"`, or both ways with `axes="both"`.
`showsIndicators` hides the scroll bars when false. It is greedy the same way
a list is, so it also needs its own box.

```tsx
<One.iOS.ScrollView style={{ height: 200 }}>
  <One.iOS.LazyVStack>
    {items.map((item) => (
      <One.iOS.Text key={item.id} text={item.title} />
    ))}
  </One.iOS.LazyVStack>
</One.iOS.ScrollView>
```

`One.iOS.LazyVStack` and `One.iOS.LazyHStack` only build the rows that are on
screen, so a long list inside a scroll view mounts fast. `alignment` is
`leading`, `center`, or `trailing` down a column and `top`, `center`,
`bottom`, `firstTextBaseline`, or `lastTextBaseline` across a row, `center` by
default; spacing is the SwiftUI platform default. They belong inside a scroll
view: outside one there is nothing to be lazy about, and a standalone lazy
stack takes the box it is given instead of measuring.

### Groups, links, and swipe actions

`One.iOS.ControlGroup` gathers controls into one labeled cluster with the
SDK-derived `controlGroupStyle` (`automatic`, `palette`, `navigation`,
`menu`, or `compactMenu`). The `label` and `systemImage` are plain strings;
an empty label renders no title.

`One.iOS.DisclosureGroup` is the controlled expandable section: `label` names
it, `isExpanded` with `onIsExpandedChange` owns its state under the same
acknowledgement and `revision` reset as the other controlled values, so
keeping the old value in the callback refuses the toggle and rolls the
native state back. It takes the box it is given, so like a form it cannot
be a child of a `One.iOS.Host` or `One.iOS.ZStack`.

`One.iOS.Divider` draws the hairline between rows and holds nothing, so it
must live inside a container and takes no children. `One.iOS.Group` is the
opposite: it holds children and draws nothing, for grouping rows without a
box of their own. `One.iOS.Link` opens `destination` (a parseable URL, checked
before the props cross); its label is either composed children or the
`label` string, with children winning when both are present.

`One.iOS.Overlay` lays a single `One.iOS.Overlay.Content` group over its base
content at `alignment` (the nine stack alignments, `center` by default),
sized to the base. `One.iOS.SwipeActions` wraps one list row and up to two
`One.iOS.SwipeActions.Actions` groups, one per edge; each group holds the
buttons for that edge, `allowsFullSwipe` (default true) decides whether a
full swipe fires the first one, and a second group on the same edge is
rejected. Swipe actions only act inside a list, so the row belongs in a
`One.iOS.List`.

```tsx
<One.iOS.List style={{ flex: 1 }}>
  <One.iOS.Section>
    <One.iOS.SwipeActions>
      <One.iOS.Text text="Swipe me" />
      <One.iOS.SwipeActions.Actions edge="trailing">
        <One.iOS.Button
          label="Delete"
          systemImage="trash"
          buttonRole="destructive"
          onPress={remove}
        />
      </One.iOS.SwipeActions.Actions>
    </One.iOS.SwipeActions>
  </One.iOS.Section>
</One.iOS.List>
```

### Labeled content

`One.iOS.LabeledContent` is the key-value row a form, a section, or a host holds. The
`label` names the row and is required. The content is either a `value` string or
composed children, never both, and one of the two is required.

```tsx
<One.iOS.Form style={{ flex: 1 }}>
  <One.iOS.Section title="Trip">
    <One.iOS.LabeledContent label="Destination" value="Lisbon, Portugal" systemImage="airplane" />
    <One.iOS.LabeledContent label="Per night">
      <One.iOS.Text text="$410" swiftStyle={{ fontWeight: 'bold' }} />
    </One.iOS.LabeledContent>
  </One.iOS.Section>
</One.iOS.Form>
```

`systemImage` adds an SF Symbol beside the label. A row with neither a value nor
children throws where it is written. Compose a row out of controls rather than a plain
`View`: the children are One Native controls, and React Native content goes in a
`One.iOS.Slot`.

A `Form` is height-greedy by default and reports no ideal height, so it fills the box
React Native gives it: give it a height or a flex parent. `sizing="content"` flips it:
the form reports the height SwiftUI measured, so a form embedded in a sheet wraps its
rows instead of filling the screen. Either way a `Form` cannot be a child of a
`One.iOS.Host`. A host measures what it holds, SwiftUI answers zero for a form, and
the form then renders nothing at all; `One.iOS.Host` throws instead of rendering a blank.
A host inside a form or a section works, and so does a section inside a host.

### React Native inside the SwiftUI tree

`One.iOS.Slot` carries a React Native subtree into a container. SwiftUI proposes the box
and the subtree lays out inside it, so a slot takes an explicit `height`.

```tsx
<One.iOS.Form style={{ flex: 1 }}>
  <One.iOS.Section title="Details">
    <One.iOS.Toggle label="Notify" isOn={on} onIsOnChange={setOn} />
    <One.iOS.Slot height={44}>
      <Pressable onPress={save}>
        <Text>An ordinary React Native row</Text>
      </Pressable>
    </One.iOS.Slot>
  </One.iOS.Section>
</One.iOS.Form>
```

A slot fills the width its container offers. A horizontal host offers none, because an
`HStack` hands out its ideal width, so a slot in one takes an explicit `width` as well.

Inside the slot everything works as it does anywhere else in React Native: touches,
state, providers, and layout. A slot has to be a child of a container, so it throws when
it is used anywhere else.

### Glass and materials

`One.iOS.Glass` draws a Liquid Glass surface with the composed children laid out on top of
it. It composes children the way a host does, and it takes the box React Native gives it,
so give it a height or a flex parent.

```tsx
<One.iOS.Glass
  style={{ margin: 16, height: 180 }}
  glassEffect="clear"
  interactive
  shape="roundedRectangle"
  cornerRadius={24}
>
  <One.iOS.Toggle label="Notifications" isOn={on} onIsOnChange={setOn} />
  <One.iOS.Button label="Save" onPress={save} />
</One.iOS.Glass>
```

`glassEffect` names the same iOS 26 Liquid Glass variants as SwiftUI: `regular`, `clear`,
or `identity`. A `One.iOS.Glass` with no surface props uses SwiftUI's default `regular`
glass; setting `material` alone instead draws that material. `interactive` is independent
of the variant, matching `Glass.interactive(_:)`, so clear and regular glass can both
react to touch. `tint` maps only to `Glass.tint(_:)`; it does not change the accent color
of controls inside the container. `colorScheme` (`light` or `dark`) sets the appearance
the surface and its children draw in, as it does on `One.iOS.Host`, so glass over a dark
band can stay dark while the app is light.

`shape` accepts `capsule`, `circle`, `containerRelativeShape`, `ellipse`, `rectangle`,
or `roundedRectangle`. Leaving it out keeps SwiftUI's default glass shape. A
`cornerRadius` with no shape selects a rounded rectangle for convenience; with
`shape="roundedRectangle"`, it supplies that shape's radius. `material` is the iOS 15
surface vocabulary: `ultraThin`, `thin`, `regular`, `thick`, or `ultraThick`. Glass wins
when both surfaces are named. Every value is drawn with the corresponding SwiftUI API,
so the surface is native rather than an approximation.

The same two names work on any control through `swiftStyle`, where they apply to that
control alone:

```tsx
<One.iOS.Button
  label="Save"
  onPress={save}
  swiftStyle={{
    glassEffect: 'clear',
    glassEffectInteractive: true,
    glassEffectShape: 'capsule',
    glassEffectTint: '#0A84FF',
  }}
/>
```

On a control, `swiftStyle.glassEffectTint` maps to `Glass.tint(_:)`, while
`swiftStyle.tint` remains SwiftUI's separate `View.tint(_:)` environment modifier.

### Popovers

`One.iOS.Popover` is both halves at once. Its children are the trigger, which composes
into SwiftUI and lays out inline like a host's content, and `content` is a React Native
subtree presented over the screen, like a sheet's.

```tsx
function ExamplePopover() {
  const [open, setOpen] = useState(false)
  return (
    <One.iOS.Popover
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
      <One.iOS.Button label="Trigger" onPress={() => setOpen(true)} />
    </One.iOS.Popover>
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

The trigger reports the height SwiftUI measured back to Yoga, exactly as `One.iOS.Host`
does, so never give a popover a height. A popover is a container, so it composes into a
form, a section or a host, and its trigger can be any One Native content.

The presented content carries its own touch handler, the same as sheet content, because
presentation leaves the React Native surface.

## Adding a native module

Every non-view native module is a [Nitro](https://nitro.margelo.com) hybrid
object: a TypeScript spec that nitrogen turns into Swift and Kotlin interfaces,
called straight through JSI. Views stay Fabric components. `OneHaptics` and
`OneClipboard` are the reference ports.

1. Write `src/specs/One<Name>.nitro.ts`: one interface extending
   `HybridObject<{ ios: 'swift'; android: 'kotlin' }>`. Prefix the name with
   `One`, because hybrid object names share one global registry with every
   other Nitro library in the app. Make a method sync when the platform API is
   sync, and return a `Promise` only when native has to wait (a main-thread hop
   whose result JS needs, a system prompt, I/O). String unions become native
   enums, so reuse the public type from the module's `types.ts`.
2. Add the name to `autolinking` in `nitro.json` with
   `implementationClassName: "HybridOne<Name>"` for both platforms, then run
   `bun run nitrogen`. Commit everything it writes under `nitrogen/generated`.
3. Implement `ios/Nitro/HybridOne<Name>.swift` as
   `final class HybridOne<Name>: HybridOne<Name>Spec`. Calls arrive on the JS
   thread: hop to main with `DispatchQueue.main.async` for fire-and-forget UIKit
   work, or return `Promise.async { @MainActor in ... }` for a result. The pod
   builds Swift with C++ interop, which imports an options (`NS_OPTIONS`)
   parameter inside a delegate's completion block as `Int`, so declare that
   block as `(Int) -> Void`. A "nearly matches optional requirement" warning
   means iOS never calls that method.
4. Implement `android/src/main/java/com/margelo/nitro/one/HybridOne<Name>.kt`
   as `class HybridOne<Name> : HybridOne<Name>Spec()`. Reach the app through
   `NitroModules.applicationContext`, and use `Promise.async { ... }` for async
   methods.
5. In the module's `index.native.ts`, create the object on first use and cache
   it: `hybrid ??= NitroModules.createHybridObject<One<Name>>('One<Name>')`.
   The public API and its argument validation stay in JS, unchanged.
6. Delete the module's legacy bridge files (the iOS `.h`/`.m` and the Kotlin
   `*Module.kt` plus its `OnePackage` entries) in the same change, and
   point its tests at a `react-native-nitro-modules` mock.
7. In Contrast, register the Peach seam with
   `registerNitroHybridObject('One<Name>', ...)` in
   `packages/peach-compat/src/stubs/one-native-register.ts`, implementing the
   same spec.

Nothing else changes per module: `One.podspec` loads nitrogen's
autolinking script, and Android builds the generated C++ into the package's
single `One` library, whose `JNI_OnLoad` registers every hybrid object.
Validate on an iOS simulator build and an Android `assembleDebug` of an app that
depends on this package.

## Generation

From `packages/one`, run:

```sh
bun run generate
bun run generate:check
bun run build
bun run typecheck
bun run test
```

Generation requires Xcode and its macOS/iPhoneSimulator SDKs. The checked-in
manifest records the target SDK ceiling, which tracks the Xcode CI pins; any
newer toolchain produces identical output. Enum cases stay mapped while the SDK
ships them, even when a newer SDK deprecates them.
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
- `one/schema.json`, described below

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
identity, child slots, and controlled events. Its `frameworks` list names the overlays whose
modifiers and enum cases reach the shared generated Swift, which is what imports
PhotosUI and WebKit there. Control recipes live in
`codegen/pickerCatalog.ts`, `codegen/formCatalog.ts`, `codegen/leafCatalog.ts`,
`codegen/mediaCatalog.ts`, `codegen/mapCatalog.ts`, `codegen/textCatalog.ts`, and
`codegen/presentationCatalog.ts`, and `codegen/emitControls.ts` turns each recipe into a
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
Sheets host RN children in a presented slot. A NavigationStack hosts RN children
in an inline slot and reads Toolbar markers as toolbar content.

Tabs, menu toggles, pickers, form controls, and sheets share optimistic native
state and numbered acknowledgments. Update React state synchronously in the
callback to accept an interaction. Keeping the prior value rejects it when the
event is acknowledged. Increment `revision` to force a new value while earlier
events are pending. Events from the previous revision are ignored. Revision is a
nonnegative Int32 scoped to that component.

`useNativeState` shares one value across any number of controlled props, in the
shape of Expo's hook: the handle carries the current `value` plus `set` and
`get`, has stable identity, and reads live, so a bound view re-renders over
the value it spreads rather than the handle itself. Each view keeps its own
acknowledgement stream, which stays coherent under sharing because an
acknowledgement only ever advances its own view's event count.

```tsx
function NameForm() {
  const name = useNativeState('')
  const notify = useNativeState(false)
  return (
    <>
      <One.iOS.TextField label="Name" text={name.value} onTextChange={name.set} />
      <One.iOS.Text text={`Hello, ${name.value}`} />
      <One.iOS.Toggle label="Notify" isOn={notify.value} onIsOnChange={notify.set} />
      <One.iOS.Toggle label="Notify copy" isOn={notify.value} onIsOnChange={notify.set} />
    </>
  )
}
```

Writes travel through the React render cycle: there is no worklets runtime here,
so synchronous UI-thread updates are out of scope. The handle also does not pass
as a prop itself yet (`text={name}`); spread the pair until the generated
adapters learn the object shape.

The shared RN slot has three policies. SwiftUI allocates tab bounds and reports
them to Fabric for Yoga. Passive menu triggers retain Yoga's coordinates and
leave interaction to the enclosing SwiftUI menu. Presented sheet content uses a
local origin and a supplied touch handler because it leaves the RN surface.

General SwiftUI tree composition, additional SDK bindings, browser rendering,
and Android rendering remain separate stages in `plans/one-native-architecture.md`.

## One.Auth.Apple and One.Browser

### One.Auth.Apple

`One.Auth.Apple` is Sign in with Apple on iOS (`isAvailable`, `signIn`,
`getCredentialState`), replacing `expo-apple-authentication`. Android and the web
report `isAvailable: false` and reject every request; there is no web fallback. The
button is `One.iOS.SignInWithAppleButton`, which runs the same flow natively, or any
button whose press calls `signIn`.

Migrating from Expo: `signInAsync` is `signIn`, `getCredentialStateAsync` is
`getCredentialState`, `isAvailableAsync()` is the `isAvailable` property, and the
enums are strings (`AppleAuthenticationScope.FULL_NAME` is `'fullName'`,
`AppleAuthenticationCredentialState.NOT_FOUND` is `'notFound'`,
`AppleAuthenticationUserDetectionStatus.LIKELY_REAL` is `'likelyReal'`). Options and
credential fields keep Expo's names. `signIn` resolves `{ type: 'success', credential }`,
or `{ type: 'cancel' }` when the user backs out, where Expo rejects with
`ERR_REQUEST_CANCELED`. A failure rejects with `E_AUTH_SIGN_IN` or
`E_AUTH_CREDENTIAL_STATE` and a message carrying the AuthenticationServices error
domain and code.

| Library | Native API | What it misses | What One does |
| :--- | :--- | :--- | :--- |
| `expo-apple-authentication` | `ASAuthorizationController` | bridge module; numeric enums; a cancel is a rejection; the native error code is dropped | Nitro hybrid object, string unions, a cancel is a result, the domain and code kept in the error |
| `@invertase/react-native-apple-authentication` | `ASAuthorizationController` | a separate package and bridge module | built into One behind the same credential shape as Expo |

### One.Browser

`One.Browser` opens pages in `SFSafariViewController` and Custom Tabs and runs authentication sessions in `ASWebAuthenticationSession` and Android's Auth Tab, replacing `expo-web-browser`.

| Library | Native API Used | What It Gets Right | What It Misses | What One Does |
| :--- | :--- | :--- | :--- | :--- |
| `expo-web-browser` | iOS `SFSafariViewController` + `ASWebAuthenticationSession`; Android `CustomTabsIntent` | auth session with redirect interception; `warmUpAsync` and `mayInitWithUrlAsync` on Android | a bridge module; Android auth runs in a plain custom tab and reads the redirect through Linking | Nitro hybrid object; Android auth uses `AuthTabIntent` (`androidx.browser` 1.9) where the browser supports it; `warmup()` and `mayLaunchUrl()` resolve whether Custom Tabs accepted them, and false on iOS, which has no counterpart |
| `react-native-inappbrowser-reborn` | iOS `SFSafariViewController`; Android `CustomTabsIntent` | Basic options like toolbar color | Does not use `ASWebAuthenticationSession` or `AuthTabIntent` for authentication (relies on deep link roundtrips); bridge module | Uses native OS authentication session primitives on both platforms with direct callbacks, and ephemeral session options |

## One.Speech

Dictation with the platform recognizer, the engine behind keyboard dictation:
`SFSpeechRecognizer` on iOS with the `dictation` task hint and automatic
punctuation, fed by `AVAudioEngine`, and the system `SpeechRecognizer` on
Android.

```ts
const { granted } = await One.Speech.requestPermissions()
const session = One.Speech.start({ lang: 'en-US' }, (event) => {
  // event.transcript is always everything heard so far
  if (event.type === 'end') send(event.transcript)
  if (event.type === 'error') show(event.error, event.message)
})
session.stop() // finish; the final transcript arrives in `end`
session.abort() // tear down with no further events
```

A session emits `start` when the microphone is live, `transcript` as the
text changes, then exactly one `end` or `error`. Stopping with nothing said
ends with an empty transcript, not an error. Starting again replaces the
running session, whose callback never fires again. The audio session is
play-and-record, so other audio pauses while listening and resumes after, and
an interruption or route change ends the session with `interrupted`. On
Android a session is one utterance: the recognizer ends it after trailing
silence, as a stop would.

Permissions take the shared response shape plus expo's `restricted`; iOS
needs both the microphone and speech recognition grants. Declare the prompts
with `native.app` `speech: { recognition, microphone }`, which also stamps
Android's `RECORD_AUDIO` and the recognition service query.

| Library | What it gets right | What it misses | What One does |
| :--- | :--- | :--- | :--- |
| `expo-speech-recognition` | Web Speech API shape, many options, file transcription | Global event listeners, so overlapping sessions need app-side generation guards; on iOS 18 a continuous session restarts the transcript after each pause and the library prefixes the next segment with a space for apps to stitch; no-speech is an error | One session object per start; native keeps the committed segments and always sends the whole transcript; no-speech is an ordinary `end` |
| `@react-native-voice/voice` | Small, long-lived | Legacy bridge, event emitter globals, no punctuation or task hint, unmaintained against recent iOS audio session rules | Nitro hybrid object, dictation task hint and punctuation, audio session deactivates with `notifyOthersOnDeactivation` |
| `SpeechAnalyzer` (iOS 26) | Apple's newer on-device long-form engine | iOS 26 and later only, while One's floor is 17 | `SFSpeechRecognizer` today; `SpeechAnalyzer` is the follow-up once the floor allows one path |

## fetch

On iOS and Android, One replaces the global `fetch` with one whose
`response.body` streams: each chunk reaches `body.getReader()` as the socket
delivers it. React Native's own fetch runs over `XMLHttpRequest`, buffers the
whole response, and has no `body`, so ndjson, server-sent events and model
output arrive all at once and streaming clients (AI SDKs) cannot read them.

```ts
const response = await fetch(url, { method: 'POST', body: JSON.stringify(input) })
const reader = response.body.getReader()
for (;;) {
  const { done, value } = await reader.read()
  if (done) break
  render(new TextDecoder().decode(value, { stream: true }))
}
```

Requests run on `URLSession` with React Native's cookie configuration on iOS,
and on Android on an OkHttp client from `OkHttpClientProvider`, so an app's
`OkHttpClientFactory` applies and cookies share React Native's `CookieManager`
store. It keeps what React Native's fetch accepts: string, `URLSearchParams`,
`ArrayBuffer`, typed array, `Blob` and `FormData` bodies (including
`{ uri, name, type }` file parts, always sent with a multipart boundary and,
wherever each length is known, a `Content-Length`), `file:` and `content:`
urls, `Request` inputs with their body as given, `credentials: 'omit'`,
`AbortSignal` (rejecting with `signal.reason`), `clone()`, `blob()` and
`formData()`. Responses pass `instanceof Response`. Network failures reject
with a `TypeError`. A binary built
without OneFetch keeps React Native's fetch. On web the browser's fetch
already streams and nothing is installed.

| | Streams `response.body` | Request bodies | Notes |
| --- | --- | --- | --- |
| React Native fetch | No; resolves after the whole body | string, Blob, FormData with `{ uri }` parts, ArrayBuffer | whatwg-fetch over XMLHttpRequest |
| `expo/fetch` | Yes | string, ArrayBuffer, Blob, FormData without `{ uri }` parts | Expo module; `blob()` copies through base64 |
| One | Yes | everything React Native fetch accepts | Nitro object; `blob()` stores bytes natively; iOS holds back the first 512 bytes of `text/plain` and `text/html` for content sniffing, as every URLSession client does |
