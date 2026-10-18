# Generated SDK runtime

Owner direction, 2026-10-17, scope: the SDK bridge and React state layer:
"We can make a few breaking changes it's fine". Existing functionality stays.
This follows the generated SDK Contrast milestone and PR 961.

Generated facades call one Nitro object, using framework names and numbered
entries. Arguments, results and callback replies travel as Nitro `AnyMap` values.
Native values stay in a separate handle array. The `$h`, `$f`, `$impl`, `$s`,
`$date`, `$data`, `$ret` and `$out` markers preserve handles, closures, delegates,
class lineage, dates, bytes and out parameters. Bytes retain their base64 marker;
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
containing an AsyncSequence. Both retain the latest value, report failures in the
snapshot and cancel their native subscription or task on unmount. AsyncSequence
cancellation uses Swift task cancellation, which the sequence must cooperate
with. Passing `null` or `undefined` keeps any hook pending without subscribing.

## Validation and performance

Run the wire and subscription checks with:

```sh
XDG_CACHE_HOME=$HOME/.cache bun run --cwd packages/one test src/platform/sdk/wire.test.ts src/platform/sdk/react.test.ts
```

`observation.probe.swift` runs the real native KVO, Observation, Combine and
AsyncSequence lifetimes against the runtime. Compile it with `OneSDKRuntime.swift`
for an iOS simulator and run the executable with `simctl spawn`. It checks initial
and changed values, cancellation, and delivery after cancellation.

The native features route `one-native-ios-sdk-bench` measures median microseconds
per call over five batches of 10,000 calls after 500 warmups. It compares the same
bundle identifier through generated Foundation and direct Nitro AppInfo, plus
string-key lookups through Foundation UserDefaults and direct Nitro Storage.
The string-key methods use different native stores, so those timings include
that difference. Its Progress fixture checks React updates and unmount/remount.

The original JSON binary on the iPhone 17 Pro iOS 27 simulator measured
30.629 microseconds for a generated HealthKit string getter and 0.515 for a direct
Nitro AppInfo string getter. Those are different native properties; compare the
HealthKit getter with the rebuilt fixture's same getter for the transport change.
Numbered-table dispatch uses numeric ranges instead of allocating and scanning
arrays of IDs on every call. Calls without callbacks reuse shared dispatchers.
