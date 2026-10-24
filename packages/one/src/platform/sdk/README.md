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

Native JavaScript facades use compact member tables and cached framework
initializers. Reading an export or resolving a returned native handle initializes
the framework, its base classes and reached extensions before exposing wrappers.
Class and prototype identity remain stable. An initializer failure is cached and
later access rethrows the same error. A native error from a generated constant
initializer occurs at first framework use rather than at import. Typed source
facades and declarations retain their generated signatures and documentation.

## React content in UIKit

`One.iOS.UIKitView` places a generated UIKit view in React Native.
`One.iOS.UIKitContent` places React Native children in UIKit. For a collection
or table, create a cell source for that native view once, then use its generated
diffable-data-source methods to apply snapshots:

```tsx
import { One } from 'one'
import { Pressable, Text } from 'react-native'
import {
  NSDiffableDataSourceSnapshot,
  type UICollectionView,
  type UICollectionViewDiffableDataSource,
} from 'one/ios/UIKit'

async function connectCollection(view: UICollectionView, ids: number[]) {
  const source = await One.iOS.collectionCellSource(view)
  const snapshot = NSDiffableDataSourceSnapshot.init()
  snapshot.appendSections([0])
  snapshot.appendItems(ids, 0)
  await source.applyAnimatingDifferences(snapshot, false)
  return source
}

function CollectionRows({
  view,
  source,
  items,
  onSelect,
}: {
  view: UICollectionView
  source: UICollectionViewDiffableDataSource<number, number>
  items: { id: number; title: string }[]
  onSelect: (id: number) => void
}) {
  return (
    <>
      <One.iOS.UIKitView view={view} style={{ height: 320 }} />
      {items.map((item) => (
        <One.iOS.UIKitContent key={item.id} source={source} item={item.id}>
          <Pressable onPress={() => onSelect(item.id)}>
            <Text>{item.title}</Text>
          </Pressable>
        </One.iOS.UIKitContent>
      ))}
    </>
  )
}
```

Call `connectCollection` during the native view's setup and retain its result for
`CollectionRows`. Use a self-sizing collection layout. For a table, use
`await One.iOS.tableCellSource(table)` and automatic row sizing. Both factories
return the generated diffable data source with integer section and item IDs.
The native cell provider attaches the React content; cell requests do not call
JavaScript synchronously.

Each `(source, item)` has one mounted `UIKitContent`, keyed by a stable item ID.
A second mount for the same item throws, even through another JavaScript handle
for the same native source. The native container supplies its width and React
measures the content height. `estimatedHeight` defaults to 44 before
measurement; `height` fixes the height. A React update re-renders the content in
its cell and the cell resizes to fit, so content changes need no
`reconfigureItems`. Unmounting empties the native cell. Snapshots remain the
generated UIKit APIs, so keep their item IDs in sync with the mounted content.

For another UIKit API that takes a `UIView`, pass `onView` instead of `source`
and `item`. It receives a stable generated `UIView` handle for that mount, which
can be passed to APIs such as `UIStackView.addArrangedSubview`. On unmount, the
retained view becomes empty with zero intrinsic height. `UIKitContent` renders
its children at their UIKit destination. Mount only the items your app needs;
a native collection's cell reuse does not virtualize those React subtrees.

## React state

Import hooks from `one/ios-runtime`. Hooks return a cached snapshot with
`status`, `value` and `error`. Subscriptions start when React commits the component
and are cancelled on unmount or when the object or property changes. Late
notifications from a previous subscription are ignored.

```tsx
import { Progress } from 'one/ios/Foundation'
import { useSDKProperty } from 'one/ios-runtime'

function DownloadProgress({ progress }: { progress: Progress }) {
  const state = useSDKProperty(progress, 'fractionCompleted')
  if (state.status === 'error') return <Text>{state.error.message}</Text>
  return <Text>{state.value ?? 0}</Text>
}
```

`useSDKProperty(object, property)` observes a property the generator found
observable. The generator decides per getter, while it still has the Swift
bodies, and stores the decision as the entry's `observation`:

- An Objective-C property (its USR starts with `c:objc(`) uses key-value
  observing. Its KVC key path comes from the Swift key path, so names supplied
  by the app never become unchecked Objective-C key paths. Delivery depends on
  that property's documented KVO compliance.
- A Swift property of a class conforming to `Observation.Observable` uses
  `withObservationTracking`, rearmed on the main queue after each mutation.
  Multiple changes can coalesce into the latest value. The dynamic cast also
  checks the conformance's availability on the running system.
- Anything else is not observable and has no observe table entry.

The native table bakes the kind into each observe case, so JavaScript passes
only the entry number. Each generated class declares a type-only
`$observable` brand listing its observable properties, inherited ones
included; `useSDKProperty` accepts only those names.

`useSDKSequence(handle)` follows a handle holding a Combine publisher or an
AsyncSequence; native code picks by the value's type. Generated AsyncSequence
and Publisher conformers declare a type-only `$element` brand from their
`Element` or `Output` alias or generic parameter, and `AsyncStream<T>` and
`AsyncThrowingStream<T, E>` results are typed `SDKSequence<T>`, so the hook's
value type is inferred. Publisher subscriptions cancel on unmount.
AsyncSequence handles own one iterator and broadcast each element to all
subscribed hooks. Unmount removes the listener immediately. Remount receives the
latest value and continues the same iterator, including React StrictMode's mount
cycle. A handle consumes its sequence while listeners are absent, retaining only
the latest value; releasing the handle cancels its iterator task, which the
sequence must cooperate with. Passing `null` or `undefined` keeps any hook
pending without subscribing.

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
