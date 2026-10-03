# Native package and shared value proposal

Public package contract, held on `feat/native-blessed-packages` for Nate:

```ts
import { blessedNativePackages } from 'one/native-packages'

type BlessedNativePackage = Readonly<{
  name: string
  range: string
  why: string
  platforms: readonly ('ios' | 'android')[]
  required: boolean
}>
```

The source list is `packages/one/src/native-packages.ts`. It drives the starter
manifest, installation example, native setup table, peer version ranges and
native checks. `bun sync:native-packages` refreshes generated consumers;
`bun check:native-packages` rejects drift. `one prebuild` checks installed
versions before writing projects; `one doctor --platform ios|android|web`
checks them without generating a project. Without a platform, doctor reads
`native.app` and skips native peers for web-only configurations.

Worklets is required by One's native sync installer. Reanimated is required by
the supported UI animation contract. Screens is required by native navigation.
Gesture handler is installed in the starter but is only required by apps using
its gestures or drawer navigation. All four are tested with RN 0.87.1, with
ranges ~0.12.2, ~4.6.0, ~4.27.0 and ~3.3.0 respectively.

npm has no platform-conditional peer metadata. Keeping Worklets and Reanimated
optional in npm metadata, then enforcing their declarations and installed
versions only in native commands, preserves web-only installation.

## Step 5: shared values for per-frame APIs

Proposal only, no implementation or exports. These shapes follow the existing
named-hook convention and use Reanimated's existing shared value type:

```ts
import type { SharedValue } from 'react-native-reanimated'

type MotionVector = Readonly<{ x: number; y: number; z: number }>
type MotionValueOptions = Readonly<{ intervalMs?: number }>

declare function useMotionValue(
  sensor: 'accelerometer' | 'gyroscope',
  options?: MotionValueOptions
): SharedValue<MotionVector>

declare function useKeyboardHeightValue(): SharedValue<number>

type PagerProps = {
  // existing props remain; offset is a fractional, zero-based page index.
  pageOffset?: SharedValue<number>
}
```

The Pager caller owns the shared value and passes it to `One.UI.Pager`.
Native updates it during dragging, settling and programmatic selection.
Motion and keyboard hooks own their values and release native subscriptions
on unmount. Keyboard height is in logical points, 0 when hidden; floating
keyboards contribute only their overlap with the window bottom. Motion units
match the existing Motion API: g for acceleration, rad/s for gyroscope.

Native writes go directly from the native frame/event producer into the UI
runtime shared value handle. An RN event listener assigning `.value` would
add a JS hop and fails this proposal's acceptance condition. On web, Pager
writes from scroll events, Motion uses browser sensor events when permission
is granted, and keyboard uses the visual viewport. Unsupported sensors retain
{x: 0, y: 0, z: 0}. Existing JS callbacks remain available and unchanged.

Before implementation: Nate approves the names, the caller-owned Pager value,
and the zero value for unsupported sensors. Then prove native thread ownership,
subscription cleanup and no JS delivery per frame in the fixture, alongside
React Compiler and worklet transform behavior.

Validation: package contract and prebuild tests, 18 passing; generated consumer
drift check and narrow lint passing. Native runtime and benchmark receipts are
tracked separately in `plans/one-native-speed.md`.
