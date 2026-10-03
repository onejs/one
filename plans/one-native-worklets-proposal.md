# Native packages and Worklets values

One should own the types and per-frame value API. Worklets provides the UI
runtime. Reanimated supplies animation features that an app chooses to use.
Pager, Motion and keyboard values should work without importing Reanimated.
This revision incorporates Nate's feedback; the per-frame APIs remain a
proposal with no implementation.

## What the package list is for

The list is build metadata for One's CLI and repository tooling. App authors
do not import it to use native features. Its readers are:

- `one prebuild`, `one run:ios`, `one run:android` and `one doctor`: check the
  native packages installed by the app before generating or running a project.
- The repository's sync script: writes the starter dependencies, installation
  example, native setup table and One's peer ranges from the same metadata.
- The real-app matrix: exercises the supported package set on each platform.

The earlier `import { blessedNativePackages } ...` example showed how a tool
could inspect the list. It was misleading as the opening app-facing example,
so it is removed. The implemented list currently has four entries. The
review branch exports it at `one/native-packages` for tooling; it adds no
runtime import to an app. Whether that tooling export should be public is
still held for review.

A blessed package means One tests and recommends a specific version range.
The metadata also needs to distinguish an app-installed peer from a dependency
already installed by `one`, so recommending a package does not imply adding
another copy to every starter.

## Full native library inventory for this proposal

RAN: read One's dependency and peer manifests, native imports, sync installer,
and the native coverage plan. The four original entries cover animation,
worklets, gestures and navigation. The wider inventory is:

| Package | Range/version in the review branch | What it supplies | Who installs it |
| --- | --- | --- | --- |
| `react-native-worklets` | `~0.12.2` | UI runtime, worklet execution, One native sync state | Native app peer |
| `react-native-reanimated` | `~4.6.0` | Animation drivers and layout transitions | Native app peer under the current proposed package contract |
| `react-native-gesture-handler` | `~3.3.0` | Gesture worklets and drawer gestures | Starter; needed by apps using those features |
| `react-native-screens` | `~4.27.0` | Native stack, tabs and split view | Native app peer |
| `@op-engineering/op-sqlite` | `18.2.5` | One.Database's SQLite implementation | One dependency |
| `react-native-nitro-modules` | `0.37.0` | One's native service bindings over JSI | One dependency |
| `react-native-nitro-image` | `0.15.2` | One's native image implementation | One dependency |
| `react-native-nitro-web-image` | `0.15.2` | Nitro Image's browser counterpart | One dependency; web side |
| `@callstack/liquid-glass` | `^0.8.1` tested; peer `>=0.6.0` | Native Liquid Glass integration | Starter; optional feature peer |
| `@tamagui/sheet` | `3.0.0-beta.1537.1` tested; peer `>=3.0.0-beta.1537.1 <4` | Optional Tamagui sheet integration | App using `one/tamagui` |

Navigation also has its own aligned package family: `@react-navigation/core`,
`native`, `routers`, `elements`, `native-stack`, `bottom-tabs` and optional
`drawer`. React and React Native are the framework baseline. Those versions
stay under the navigation and React Native upgrade contract; the real-app
lane is currently updating navigation, so this document does not freeze its
moving alpha versions.

The intended complete metadata includes the table above, with installation
ownership recorded. The implementation on the branch currently synchronizes
and checks the initial four peers. Extending it to One-owned dependencies must
check their installed versions without requiring a duplicate app declaration.

The old coverage plan also calls for a blessed file-system library without
naming one. There is no extra package to list as selected: One now has its own
FileSystem implementation. MMKV, quick-crypto, Expo modules and
`react-native-pager-view` appear in benchmark or migration evidence; that alone
does not make them a selected dependency.

## Exact per-frame API shapes

Types are defined by One. There is no Reanimated type import:

```ts
import { One, useSharedValue, useMotionValue, useKeyboardHeightValue } from 'one'
import type { SharedValue } from 'one'

// owned by One; the methods also support React Compiler's mutation rules.
interface SharedValue<T> {
  value: T
  get(): T
  set(value: T): void
}

type MotionVector = Readonly<{ x: number; y: number; z: number }>
type MotionValueOptions = Readonly<{ intervalMs?: number }>

declare function useSharedValue<T>(initial: T): SharedValue<T>

declare function useMotionValue(
  sensor: 'accelerometer' | 'gyroscope',
  options?: MotionValueOptions
): SharedValue<MotionVector>

declare function useKeyboardHeightValue(): SharedValue<number>

type PagerProps = {
  // existing props remain; fractional, zero-based page index.
  pageOffset?: SharedValue<number>
}

function Gallery() {
  const pageOffset = useSharedValue(0)
  return <One.UI.Pager pageOffset={pageOffset}>{/* pages */}</One.UI.Pager>
}
```

`useSharedValue` allocates a stable handle without subscribing the component
to every frame. Pager updates the caller's handle while dragging, settling and
selecting a page programmatically. Motion and keyboard hooks allocate their
own handles and stop their native producers on unmount. Sensor units match
One.Motion: g for acceleration, rad/s for gyroscope. Keyboard height is in
logical points, 0 when hidden; a floating keyboard contributes only overlap
with the window bottom. Changing Motion options updates its existing producer
and retains the handle.

## Runtime ownership

Reuse One's native sync registry and JSI handles, which already reach both the
React Native runtime and the Worklets UI runtime. The existing
`useNativeState` subscribes React for controlled native props; per-frame hooks
must use its storage layer without that React subscription.

A native Pager, sensor or keyboard producer writes directly to the native
registry. Worklets reads the same value on the UI thread. A JS event listener
assigning `.value`, serializing values across runtimes per frame, or rerendering
React per frame fails the proposed contract. JS delivery happens only when a
caller explicitly subscribes through the existing state facilities.

Worklets supplies execution and runtime scheduling, not Reanimated's reactive
mapper or animation driver. One must define and prove its own UI subscription
behavior before shipping these hooks. Reading a One value inside a Reanimated
worklet can be supported, but automatic `useAnimatedStyle` dependency tracking
is not assumed: that integration needs a runtime proof and must stay outside
the Pager, Motion and keyboard implementations. Reanimated animation helpers
such as `withTiming` continue to belong to Reanimated.

On web the same One-owned handle uses memory storage, Pager uses scroll events,
Motion uses permission-granted browser sensor events and keyboard height uses
the visual viewport. Unsupported sensors retain `{ x: 0, y: 0, z: 0 }`.
Existing JS callbacks remain available. A web-only app installs neither
Worklets nor Reanimated for these One hooks.

## Current work and next gate

The pushed package branch is `feat/native-blessed-packages`. RAN: 27 package,
prebuild and native-run checks pass, including rejecting missing peers for
already-generated projects and leaving web-only apps unaffected. The generated
consumer drift check runs in `check:deps`; narrow lint passes.

The current step 2 branch still requires Reanimated for native apps because
that was the original assignment. The revised per-frame APIs themselves need
only Worklets. Keeping Reanimated required for the default native animation
contract, or making it an optional animation feature peer, is a separate package
decision from the storage and hook implementation.

Step 5 remains design only. Next acceptance: native and UI runtime thread
ownership, producer cleanup, stable handle identity, UI subscriptions without
per-frame JS delivery, React Compiler behavior, and the optional Reanimated
integration demonstrated explicitly. No new per-frame exports have landed.
