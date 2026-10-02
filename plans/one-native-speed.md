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
| `One.Motion` | expo-sensors, react-native-sensors | unmeasured: delivered event rate and JS cost per event at 60 and 120 Hz |
| `One.ImageManipulator` | expo-image-manipulator | unmeasured: resize and encode time for a 12 MP photo |

Each unmeasured row: add the benchmark to its fixture, run it beside the rival
on device, and redesign the loser before anything else lands on that API.
