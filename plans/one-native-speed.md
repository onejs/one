# One native speed

Owner direction: One's native APIs are the fastest available. Rule in
`one-native-api-conventions.md` section 4: a hot-path API matches or beats the
fastest library doing the same job, measured on device (iOS Release and
Android) with the same workload, benchmark kept in its `tests/native-features`
fixture.

| api | rival | state |
| --- | --- | --- |
| `One.Storage` | MMKV 3.3.3 | shared C++ engine over an mmap log; device numbers pending (the Swift/Kotlin version lost 7-12x on writes) |
| global `crypto` | react-native-quick-crypto | shared C++ over `arc4random_buf`, fills the caller's buffer in place; device numbers pending |
| `One.Database` | op-sqlite | is op-sqlite, the fastest SQLite binding; nothing to win |
| `One.FileSystem` | expo-file-system, react-native-nitro-fs | unmeasured; iOS only, and no read call yet |
| `fetch` streaming | expo/fetch | unmeasured: per-chunk latency and throughput for a large streamed body |
| `One.Motion` | expo-sensors, react-native-sensors | unmeasured: delivered event rate and JS cost per event at 60 and 120 Hz |
| `One.ImageManipulator` | expo-image-manipulator | unmeasured: resize and encode time for a 12 MP photo |

Each unmeasured row: add the benchmark to its fixture, run it beside the rival
on device, and redesign the loser before anything else lands on that API.
