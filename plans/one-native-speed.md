# One native speed

Owner direction: One's native APIs are the fastest available. Rule in
`one-native-api-conventions.md` section 4: a hot-path API matches or beats the
fastest library doing the same job, measured on device (iOS Release and
Android) with the same workload, benchmark kept in its `tests/native-features`
fixture.

| api | rival | state |
| --- | --- | --- |
| `One.Storage` | MMKV 3.3.3 | wins all five calls on both platforms (iOS 27 simulator Release, Pixel 8 emulator; µs medians, iOS: set 0.40 vs 0.51, get 0.18 vs 0.21, overwrite 0.32 vs 0.39, remove 0.17 vs 0.28; Android: set 1.33 vs 2.87, get 0.67 vs 0.81). Shared C++ engine whose values live only in an mmap log, compacted only when full, behind a wrapper with no extra JS frames. Physical-device run still to do |
| global `crypto` | react-native-quick-crypto 1.1.7 | shared C++ over `arc4random_buf`, fills in place. `randomUUID` wins 6x iOS, 4x Android; 16-byte fills win on iOS, trail 14% on Android; 4 KB fills trail 25% on iOS and 4.6x on Android, probably (unverified) because bionic's `arc4random` is portable ChaCha behind a lock while quick-crypto uses OpenSSL's hardware-AES DRBG. Closing that needs a vetted vectorized DRBG, never a hand-rolled one |
| `One.Database` | op-sqlite | is op-sqlite, the fastest SQLite binding; nothing to win |
| `One.FileSystem` | expo-file-system, react-native-nitro-fs | unmeasured; iOS only, and no read call yet |
| `fetch` streaming | expo/fetch | unmeasured: per-chunk latency and throughput for a large streamed body |
| `One.UI.Pager` | react-native-pager-view 8.0.5 | iOS 27 Release: delivery 45.63 vs 45.04 events/s; callback mean 0.94 vs 4.74 µs (5.02× faster), p95 1.33 vs 5.58 µs. Seven identical drags per component. Android 17 arm64 emulator: counterbalanced delivery 60.01 vs 59.96 events/s; callback mean 3.08 vs 24.82 µs (8.06× lower), p95 4.50 vs 37.00 µs. Seven identical drags per component; both deliver the native frame rate |
| `One.Motion` | expo-sensors, react-native-sensors | unmeasured: delivered event rate and JS cost per event at 60 and 120 Hz |
| `One.ImageManipulator` | expo-image-manipulator | unmeasured: resize and encode time for a 12 MP photo |

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
