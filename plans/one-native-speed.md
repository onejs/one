# One native speed

Owner direction: One's native APIs are the fastest available. Rule in
`one-native-api-conventions.md` section 4: a hot-path API matches or beats the
fastest library doing the same job, measured on device (iOS Release and
Android) with the same workload, benchmark kept in its `tests/native-features`
fixture.

| api | rival | state |
| --- | --- | --- |
| `One.Storage` | MMKV 3.3.3 | wins all five calls on both platforms (iOS 27 simulator Release, Pixel 8 emulator; µs medians, iOS: set 0.40 vs 0.51, get 0.18 vs 0.21, overwrite 0.32 vs 0.39, remove 0.17 vs 0.28; Android: set 1.33 vs 2.87, get 0.67 vs 0.81). Shared C++ engine whose values live only in an mmap log, compacted only when full, behind a wrapper with no extra JS frames. Physical-device run parked: connected iPhone Air found, signing blocked; benchmark saved on `tm/one-native-speed-parked` |
| global `crypto` | react-native-quick-crypto 1.1.7 | shared C++ over `arc4random_buf`, fills in place. `randomUUID` wins 6x iOS, 4x Android; 16-byte fills win on iOS, trail 14% on Android; 4 KB fills trail 25% on iOS and 4.6x on Android, probably (unverified) because bionic's `arc4random` is portable ChaCha behind a lock while quick-crypto uses OpenSSL's hardware-AES DRBG. Closing that needs a vetted vectorized DRBG, never a hand-rolled one; parked with benchmark saved, no new runs or crypto changes |
| `One.Database` | op-sqlite | is op-sqlite, the fastest SQLite binding; nothing to win |
| `One.FileSystem` | expo-file-system, react-native-nitro-fs | parked, unmeasured: benchmark and Android Kotlin implementation saved on `tm/one-native-speed-parked`; C++/Kotlin compile, runtime validation pending; no read call |
| `fetch` streaming | expo/fetch | parked, unmeasured: paced latency and large-body throughput benchmark saved on `tm/one-native-speed-parked`; no implementation changes |
| `One.UI.Pager` | react-native-pager-view 8.0.5 | iOS 27 Release: delivery 45.63 vs 45.04 events/s; callback mean 0.94 vs 4.74 µs (5.02× faster), p95 1.33 vs 5.58 µs. Seven identical drags per component. Android 17 arm64 emulator: counterbalanced delivery 60.01 vs 59.96 events/s; callback mean 3.08 vs 24.82 µs (8.06× lower), p95 4.50 vs 37.00 µs. Seven identical drags per component; both deliver the native frame rate |
| `One.Motion` | expo-sensors, react-native-sensors | parked, unmeasured: 60 Hz/native-maximum benchmark, Android Kotlin implementation and interval-zero semantics saved on `tm/one-native-speed-parked`; C++/Kotlin compile, live-device validation pending |
| `One.ImageManipulator` | expo-image-manipulator | parked, unmeasured: 12 MP resize/JPEG/PNG benchmark and Android Kotlin implementation saved on `tm/one-native-speed-parked`; C++/Kotlin compile, runtime validation pending |

Each unmeasured row: add the benchmark to its fixture, run it beside the rival
on device, and redesign the loser before anything else lands on that API.

Pager iOS measurement: iPhone 17 Pro simulator, iOS 27.0, Release native
binary from `88b9fd7a9`, production fixture JavaScript from `a64f4f8af`.
Seven one-second, 70%-width rightward drags per component, native selection
2 to 1, using identical pages, scroll handler, keyboard mode and gesture.
The callback counts and times only the native dragging state. Events/s is
(count−1)/(last−first); costs include each component's JavaScript wrapper and
the shared handler, excluding the shared RN dispatcher. Each reported cost is
the median of seven per-drag means or p95 values. Median event count is 55 for
both. The synthesized input is the same for both; these are simulator workload
rates, not a claim about 120 Hz delivery on physical hardware. Native selected
page, visible page, fractional progress and settled idle are asserted each run.
Raw data and screenshots: Contrast branch `tm/one-ui-pager`,
`artifacts/one-ui-pager/ios-speed.json`, `ios-speed-one.png` and
`ios-speed-pager-view.png`. The runner stays in
`tests/native-features/scripts/pager-ios-benchmark.ts`.

Pager Android measurement: Pixel 8 Android 17/API 37 arm64 emulator, native
binary `378ef2755`, fixture JavaScript `a64f4f8af`, runner `f573e317f`.
The same one-second, 70%-width drags and drag-only callback accounting as iOS,
with component order counterbalanced across seven pairs. All 14 runs assert
visible page 2 before dragging, fractional progress, selected page 1 and idle.
Median event counts: 56 vs 55. All samples, including the first pair at 30
events/s, are retained. Delivery differs by 0.10%, within timing noise; the
measured win is callback cost while retaining full native delivery.
The emulator runs `-gpu host`: Apple M5 Max via Metal, with min/peak refresh
set to 60 for both components. Earlier software-renderer and sequential-order
runs are retained as diagnostics and excluded from the final comparison.
Raw data: Contrast `artifacts/one-ui-pager/android-speed-counterbalanced.json`,
with per-drag `*-frames.txt` native gfxinfo, and `*-one.png`/`*-pager-view.png`.
The exclusive reservation released when the runner exited.


## parked speed lane

Stopped at Nate's request. Save branch: `tm/one-native-speed-parked`, commit
`5d2a77c495860e458f64a182936ea3aaf39add6a`, based on `fcdfa011a`.
No native implementation from this lane landed on `v2-beta`. The unchanged
Database and Pager rows above retain their existing evidence.

RAN: the host TypeScript check and production JavaScript bundle passed. Android
completed One's C++ and Kotlin compile tasks; packaging was stopped before an
APK completed. The iOS 27 Release simulator build returned failure. Runtime
contracts and all seven-run comparisons remain unrun; no new speed numbers
were collected. Build diagnostics and source hashes are saved under
`tests/native-features/proofs/native-speed/parked-*` on the save branch.

RAN: discovery found a connected physical iPhone Air on iOS 27, reachable from
pro-128 and air-32. Its development signing profile was unavailable: Xcode
reported no account/profile, and neither machine's installed development
profiles included the phone. Physical Storage and live iOS Motion remain
pending signing; this is not an absent-device skip. Both claimed simulators
were released, the local simulator shut down, and owned builds/server stopped.
No Android emulator was started or claimed by this lane.

Remaining: finish native packaging and lifecycle checks; verify equal FileSystem
stat metadata before timing; run all rivals on iOS 27 Release and Android with
seven counterbalanced runs and retained raw data; run physical Storage and live
Motion; investigate any losing API, redesign its cause and remeasure. The save
branch documents that Motion callback timings currently cover the shared handler
only. No performance or platform-parity claim follows from compilation.


## worklet compilation (launch rank 3)

RAN: three counterbalanced pairs per app on studio-64, Apple M5 Max (18 cores),
2026-10-03, under `bun heavy --exclusive`. Each backend runs in a fresh Bun
process and builds the complete iOS production bundle twice, with minification
and source maps off. Cold is the first bundle; warm is the second complete
bundle in that process. Config loading is timed separately and excluded.
The OS page cache is not purged. These are bundle times, not isolated transform
times or native build times.

| app | backend | cold samples (ms) | cold median (ms) | warm samples (ms) | warm median (ms) |
| --- | --- | --- | --- | --- | --- |
| one-basic | One OXC | 3896.3, 4100.6, 2810.6 | 3896.3 | 2669.3, 3029.3, 2266.7 | 2669.3 |
| one-basic | Worklets Babel plugin | 4535.6, 4029.8, 3339.4 | 4029.8 | 3357.5, 3285.1, 2710.6 | 3285.1 |
| Contrast mobile | One OXC | 11311.0, 11508.7, 16832.5 | 11508.7 | 9280.6, 10813.2, 18870.7 | 10813.2 |
| Contrast mobile | Worklets Babel plugin | 12808.0, 13957.8, 19669.7 | 13957.8 | 14707.1, 14404.9, 15372.0 | 14707.1 |

INFERRED from these medians: One reduces cold/warm bundle time by 3.3%/18.7%
on the starter and 17.5%/26.5% on Contrast mobile. All samples are retained;
One loses the third mobile warm pair. Shared host activity produces substantial
variance, so the smaller starter cold difference needs repeated measurement
before treating it as a reliable speed gain. The results support keeping One's
existing transform and removing the automatic Babel worklet fallback.

RAN: Reanimated 4.6.0's plugin delegates to `react-native-worklets/plugin`;
Worklets is 0.12.2. The starter bundle contains worklet hashes in 28 source
files under either backend. Contrast contains 258 under One and 253 under
Babel: the old automatic Babel keyword gate misses newer gesture hook names.
This count detects transformation coverage, not semantic equivalence.
Runtime equivalence is checked separately by the layout, gesture and runOnUI
fixture documented in `tests/native-features/WORKLETS.md`.

The starter run used One `fcdfa011a`; mobile used `548f0155f` and Contrast
`1301762085bf5fb61145243d4c687a1d30852add`. Concurrent dirty native service and
fixture files are listed in the receipts; compiler source was unchanged for
both timing runs. Bundles differ in bytes because the transforms produce
different code. Samples, bundle hashes, sizes and configuration are retained
in `tests/native-features/evidence/worklets/bundles.json`.

Runner: `scripts/native-worklets-benchmark.ts`. To repeat the comparison after
fallback removal, pass `--babel-baseline` with a built checkout of
`99e6e988e` (the last validation checkpoint with automatic Babel selection).
Install and build that checkout's compiler dependencies once, then run both
commands under the same exclusive measurement reservation:

```sh
bun scripts/native-worklets-benchmark.ts --root examples/one-basic --babel-baseline "$ONE_BABEL_BASELINE" --output /tmp/worklets-starter.json
bun scripts/native-worklets-benchmark.ts --root ~/contrast/templates/contrast-mobile --babel-baseline "$ONE_BABEL_BASELINE" --output /tmp/worklets-mobile.json
```

The Babel baseline runs its own benchmark child and compiler. The current
checkout runs One's path. No Babel fallback remains in the production compiler.
