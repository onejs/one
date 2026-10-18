# Generated SDK runtime

Owner direction, 2026-10-17, scope: the SDK bridge and React state layer:
"We can make a few breaking changes it's fine". Existing functionality stays.
This follows the generated SDK Contrast milestone and PR 961.

Generated facades call one Nitro object, using framework names and numbered
entries. Arguments, results and callback replies travel as Nitro `AnyMap` values.
Native values stay in a separate handle array. The `$h`, `$id`, `$f`, `$impl`, `$s`,
`$date`, `$data`, `$ret` and `$out` markers preserve handles, closures, delegates,
class lineage, dates, bytes and out parameters. Native class identity is stable
across calls. The wrapper cache holds weak references, so reading a singleton
or child getter during rendering keeps the same React subscription without
retaining every SDK object indefinitely. Bytes retain their base64 marker;
there is no JSON serialization of calls or callbacks.

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
emits the native key path and getter number; names supplied by the app never
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
sequence while listeners are absent, retaining only the latest value; releasing
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
and changed values, cancellation, and delivery after cancellation. The simulator
probe also verifies stable native reference identity, broadcast to two sequence
listeners, independent unsubscribe, latest-value replay and continued iteration
after remount, and task cancellation when the handle is released.

The original per-subscriber iterator was reproduced on iOS 27: two AsyncStream
iterators partitioned values rather than broadcasting them, and cancellation
terminated the stream for a later iterator. The shared handle-owned iterator
passes those fanout and remount regressions on the same simulator. The renderer
regression also reproduces the original singleton subscription loop; the fixed
hook reaches its value, keeps one subscription across rerenders and cancels on
unmount.

The native features route `one-native-ios-sdk-bench` measures median microseconds
per call over five batches of 10,000 calls after 500 warmups. It compares the same
ProcessInfo low-power property through generated Foundation and direct Nitro
Battery, plus string-key reads and two-string writes through Foundation
UserDefaults and direct Nitro Storage. Battery returns a promise and dispatches
to main; the generated Foundation getter is synchronous. Storage is C++, while
UserDefaults is Foundation, so those timings include different native stores.
AppInfo is no longer registered on iOS and is not used by the current fixture.
Its Progress fixture checks React updates and unmount/remount.

The original JSON binary (inherited simulator build; configuration was not
recorded) on the iPhone 17 Pro iOS 27 simulator measured
30.629 microseconds for a generated HealthKit string getter and 0.515 for a direct
Nitro AppInfo string getter. Those are different native properties; compare the
HealthKit getter with the rebuilt fixture's same getter for the transport change.
Numbered-table dispatch uses numeric ranges instead of allocating and scanning
arrays of IDs on every call. Calls without callbacks reuse shared dispatchers.

The rebuilt Debug binary with stable identity and shared sequence iteration
on an iPhone 17 Pro iOS 27 simulator measured:

| Call | Microseconds per call |
| --- | ---: |
| Generated HealthKit string getter, Nitro values | 16.620 |
| Generated ProcessInfo low-power getter | 16.701 |
| Direct Battery low-power read, asynchronous | 20.220 |
| Generated UserDefaults string-key read | 22.403 |
| Direct C++ Storage string-key read | 0.397 |
| Generated UserDefaults two-string write | 84.282 |
| Direct C++ Storage two-string write | 0.536 |

The historical HealthKit measurements are 30.629 microseconds with JSON and
16.620 with AnyMap. The AnyMap build was Debug; the JSON build configuration
cannot be verified from the retained evidence. These numbers do not establish
a controlled percentage improvement. They were separate runs on the same
simulator, not isolated hardware performance trials.
The generated low-power read beats the existing direct asynchronous module;
this does not establish parity with a direct synchronous Nitro signature.
The string methods do not meet direct C++ Nitro performance. The generic path
still constructs value-map envelopes, converts AnyValue to Swift values and back,
marshals handles, and dispatches numbered entries. Direct Storage has fixed C++
signatures and no Swift conversion. UserDefaults also does different native work,
especially for writes, so the measured gap cannot all be attributed to transport.
Removing JSON alone does not remove these costs; no general direct-module parity
is claimed.

The full native Debug app build passed with stable native identity and shared
sequence iteration. Maestro verified Progress values 0, 0.25 after native
mutation, then 0.5 after unmount, mutation and remount. A second component reads
`ProcessInfo.processInfo` afresh during every render; Maestro verified its
thermal state reaches `nominal`, wrapper identity stays stable across two
requested rerenders, and the value and identity survive remount. Native lifetime probes additionally
verified KVO, Observation, Combine and AsyncSequence stop delivering after cancel;
the React store checks reject stale callbacks after remount.
