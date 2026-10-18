# Generated SDK runtime

Owner direction, 2026-10-17, scope: the SDK bridge and React state layer:
"We can make a few breaking changes it's fine". Existing functionality stays.
This follows the generated SDK Contrast milestone and PR 961.

Generated facades call one Nitro object, using framework names and numbered
entries. Zero-argument, one-argument and two-argument calls pass their receiver,
arguments and results directly as Nitro `OneSDKValue` variants (`null`, `boolean`,
`number`, `string`, `ArrayBuffer`, `Date`, `OneSDKHandle`, `OneSDKRect`,
`OneSDKPoint`, or `OneSDKResult`). Calls with three or more arguments, out
parameters, callbacks, protocol implementations, or nested collections fall back
to `OneSDKResult` envelopes with separate `handles` and `buffers` arrays.
The `$h`, `$b`, `$f`, `$impl`, `$date`, `$ret` and `$out` markers preserve nested
handles, `ArrayBuffer` payloads, closures, delegates, dates and out parameters.
Handle metadata (`typeName`, `identity`, `superclasses`, `callable`) lives on
`OneSDKHandle`. Native class identity is stable across calls. The wrapper cache
holds weak references, so reading a singleton or child getter during rendering
keeps the same React subscription without retaining every SDK object
indefinitely. Binary payloads cross JSI as `ArrayBuffer` and `Data` without
base64 encoding or JSON serialization.

The JavaScript and native parts must be rebuilt together after a bridge change.
Regenerate Nitro bindings and the app SDK pod when rebuilding. Facades carry the
same generation as their native tables, so stale combinations fail at the call.

## React state

Import hooks from `one/ios-runtime`. Hooks return a cached snapshot with
`status`, `value` and `error`. Subscriptions start when React commits the component
and are cancelled on unmount or when the object, property or observation kind
changes. Late notifications from a previous subscription are ignored.

```tsx
import { Progress } from 'one/ios/Foundation'
import { useSDKProperty } from 'one/ios-runtime'

function DownloadProgress({ progress }: { progress: Progress }) {
  const state = useSDKProperty(progress, 'fractionCompleted')
  if (state.status === 'error') return <Text>{state.error.message}</Text>
  return <Text>{state.value ?? 0}</Text>
}
```

`useSDKProperty(object, property)` observes a KVO-compliant property. The generator
emits the native key path and getter number, and names supplied by the app never
become unchecked Objective-C key paths. A property without a KVC key path reports
an error. KVO delivery depends on that SDK property's documented KVO compliance.

Use `useSDKProperty(object, property, 'tracking')` for a property on an
`Observation.Observable` object. Reads rearm through `withObservationTracking`
after each mutation, on the main queue. Multiple changes can coalesce into the
latest value. A non-observable object reports an error.

`useSDKPublisher<Value>(publisher)` subscribes to a generated handle containing a
Combine publisher. `useSDKAsyncSequence<Value>(sequence)` consumes a handle
containing an AsyncSequence. Both retain the latest value and report failures
in the snapshot. Publisher subscriptions cancel on unmount. AsyncSequence handles own
one iterator and broadcast each element to all subscribed hooks. Unmount removes
the listener immediately. Remount receives the latest value and continues the
same iterator, including React StrictMode's mount cycle. A handle consumes its
sequence while listeners are absent, retaining only the latest value, and releasing
the handle cancels its iterator task, which the sequence must cooperate with.
Passing `null` or `undefined` keeps any hook pending without subscribing.

## Validation and performance

Run the wire and subscription checks with:

```sh
XDG_CACHE_HOME=$HOME/.cache bun run --cwd packages/one test src/platform/sdk/wire.test.ts src/platform/sdk/react.test.ts
```

`observation.probe.swift` runs the real native KVO, Observation, Combine and
AsyncSequence lifetimes against the runtime. Compile it with `OneSDKRuntime.swift`
for an iOS simulator and run the executable with `simctl spawn`. It checks initial
and changed values, cancellation, delivery after cancellation, and direct
`OneSDKCall` / `OneSDKConvert` fast paths (`CGRect`, `CGPoint`, `Data`, `Date`,
`String`, `NSObject` receiver, and `$b` buffers). The simulator probe also
verifies stable native reference identity, broadcast to two sequence listeners,
independent unsubscribe, latest-value replay and continued iteration after
remount, and task cancellation when the handle is released.

The native features route `one-native-ios-sdk-bench` measures median microseconds
per call and median JS heap bytes allocated per call (`HermesInternal.getInstrumentedStats().js_totalAllocatedBytes`)
over five batches of 10,000 calls after 500 warmups.

Measured on the same iPhone 17 Pro iOS 27.0 simulator (`715F6553-2F11-4315-9D0C-D19F18973DBB`,
Debug configuration, no physical device attached on `studio-64`) before and after
replacing `AnyMap` call envelopes and base64 `Data` encoding with direct
`OneSDKValue` Nitro arguments and results:

| Call | Before (`AnyMap` + base64) | After (direct `OneSDKValue`) | Speedup / allocation change |
| --- | ---: | ---: | --- |
| Generated HealthKit string getter (`quantity.identifier`) | 16.459 us (2352 B/call) | 3.628 us (528 B/call) | 4.5x faster, 4.5x fewer bytes |
| Generated ProcessInfo low-power getter (`process.isLowPowerModeEnabled`) | 16.436 us (2296 B/call) | 2.951 us (472 B/call) | 5.6x faster, 4.9x fewer bytes |
| Direct Nitro Swift bool getter (`updates.isEnabled`) | 0.125 us (24 B/call) | 0.134 us (24 B/call) | Direct Nitro baseline |
| Direct Nitro Battery low-power read, async (`battery.isLowPowerModeEnabled()`) | 20.209 us (864 B/call) | 19.759 us (864 B/call) | Direct async Nitro baseline |
| Generated Bundle info read (`bundle.object('OneUpdatesRuntimeVersion')`) | 24.999 us (2720 B/call) | 7.791 us (600 B/call) | 3.2x faster, 4.5x fewer bytes (3.4x direct Swift getter) |
| Direct Nitro Swift bundle getter (`updates.runtimeVersion`) | 2.327 us (56 B/call) | 2.267 us (56 B/call) | Direct Swift baseline calling the same `Bundle.main.object(forInfoDictionaryKey:)` |
| Generated UIKit struct + string call (`UIGraphicsSetPDFContextDestinationForRect`) | 31.972 us (5984 B/call) | 5.397 us (632 B/call) | 5.9x faster, 9.5x fewer bytes |
| Generated Foundation `CGRect` to string call (`NSCoder.stringFor72204(rect)`) | 32.235 us (5808 B/call) | 6.473 us (592 B/call) | 5.0x faster, 9.8x fewer bytes |
| Generated UserDefaults string-key read (`defaults.string(key)`) | 21.877 us (2720 B/call) | 5.073 us (600 B/call) | 4.3x faster, 4.5x fewer bytes |
| Direct C++ Storage string-key read (`storage.getItem(key)`) | 0.386 us (56 B/call) | 0.391 us (56 B/call) | Direct C++ baseline (in-memory C++ map vs `NSUserDefaults`) |
| Generated UserDefaults two-string write (`defaults.setForKey83917('benchmark', key)`) | 84.439 us (3032 B/call) | 62.818 us (648 B/call) | 21.6 us less transport overhead, 4.7x fewer bytes |
| Direct C++ Storage two-string write (`storage.setItem(key, 'benchmark')`) | 0.575 us (24 B/call) | 0.520 us (24 B/call) | Direct C++ baseline |
| Generated Foundation `Data` `ArrayBuffer` round-trip (`Data.init77651(payload)`) | 27.458 us (3544 B/call) | 5.119 us (704 B/call) | 5.4x faster, 5.0x fewer bytes |

For identical native work (`Bundle.main.object(forInfoDictionaryKey: "OneUpdatesRuntimeVersion")`),
the generated SDK call is within 3.4x of the direct Swift Nitro module (7.791 us
vs 2.267 us, down from 10.7x before). Trivial getters, struct + string calls,
string-key lookups, and `ArrayBuffer` round-trips run in 2.95 to 6.47 microseconds
per call in a Debug simulator build and allocate 472 to 704 bytes per call on
the JS heap. `UserDefaults.set(_:forKey:)` spends roughly 58 microseconds inside
Foundation preference synchronization regardless of bridge transport.

Maestro verified `one-native-ios-sdk-bench` (benchmarks, Progress KVO updates
0 to 0.25 and 0.5 after unmount/remount, and ProcessInfo singleton wrapper
identity across rerenders), the full SDK spike (`one-native-ios-sdk`),
`one-native-ios-unified-network`, and `one-native-ios-unified-clipboard`.
