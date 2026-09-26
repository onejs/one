# One native iOS API lane

Owner: `one-native-ios-apis`. Branch: `v2-beta`. Scope: iOS runtime APIs and their
One docs and simulator proofs. Contrast migration, Android implementations, and
direct Swift/Kotlin import belong to other lanes.

## Working rule

Take the highest useful missing API without a live owner. Ship its public types,
native implementation, docs, and an iOS 27 simulator proof together. Add a Peach
conformance check when Peach can simulate the observable behavior. Review each
assembled API batch once with `opus-high` before pushing. Repeat from the matrix.

`covered` means One exposes the useful app path. `partial` means a useful path exists
but common operations or direct simulator proof are absent. `missing` means no One
API for that capability. A React Native or third-party package alone does not make
an entry covered. Proof refers to the iOS fixture suites in
`tests/native-features/scripts/one-native-conformance.ts`; it is separate from API
status. This inventory reads the v2-beta source and fixture matrix on 2026-09-26.
Expo's [SDK reference](https://docs.expo.dev/versions/latest/) supplies the breadth
checklist; One's own exports and docs decide the status.

| Capability | Status | One path and current limit | iOS proof | Priority |
| --- | --- | --- | --- | --- |
| Haptics | covered | `One.Haptics` | haptics fixture | done |
| Local and push notifications | covered | `One.Notifications` | notifications fixture | done |
| Camera capture | covered | `One.ImagePicker.launchCamera` | image-picker fixture | done |
| Photo selection | covered | `One.ImagePicker.launchLibrary`, `One.iOS.PhotosPicker` | image-picker; PhotosPicker unproven | done |
| Photo library save/manage | missing | no Photos write or album API | none | P2 |
| Location and geocoding | missing | no CoreLocation service | none | P0 |
| Maps | partial | `One.UI.Map`, `One.iOS.Map`; no search or directions service | map, ui-map | P2 |
| Share | partial | `One.iOS.ShareLink`; no imperative share sheet | ShareLink unproven | P1 |
| Clipboard | covered | `One.Clipboard` text | clipboard | done |
| Secure storage | partial | `One.SecureStore` key/value; no access-control options | none | P1 |
| Biometrics | covered | `One.iOS.LocalAuthentication` policy status and biometric evaluation | local-authentication: unenrolled, enrolled, Face ID match | done |
| Document picking | partial | `One.DocumentPicker`; fixture has no suite | none | P1 |
| File system | partial | `fetch(file://)` reads, picker cache copies; no general write/move/delete API | media and apple-file cover bounded file paths | P1 |
| Background tasks | missing | no BGTaskScheduler path | none | P2 |
| Deep links | covered | One router and linking integration | router tests; external browser callback | done |
| App icons | partial | static prebuild icon; no alternate icon switch | prebuild only | P2 |
| In-app purchases | missing | no StoreKit API or purchase hooks | none | P2 |
| Audio playback/recording | missing | no AVAudioSession/player/recorder API | none | P1 |
| Video playback | partial | `One.iOS.VideoPlayer`; no media controls/session API | media | P2 |
| Picture in picture | partial | `One.UI.PictureInPicture`; video path needs device proof | simulator cannot enter PiP | P2 |
| Sensors and motion | missing | no CoreMotion service | none | P2 |
| Contacts | missing | no Contacts service | none | P2 |
| Calendar and reminders | missing | no EventKit service | none | P2 |
| Web browser/auth session | covered | `One.Browser` | browser | done |
| Web view | partial | `One.iOS.WebView`; fixture not opened by suite | none | P2 |
| Splash | partial | launch storyboard and first-content hold; no imperative hide API | prebuild only | P2 |
| Status bar | partial | React Native StatusBar, no One facade | none | P3 |
| Safe area | covered | `One.UI.SafeArea` | safe-area | done |
| Device identity | partial | `One.AppInfo` binary ID; no model/system snapshot | app-info fixture | P1 |
| Network state/fetch | covered | `One.Network`, `One` fetch | network and fetch fixtures | done |
| Speech recognition | covered | `One.Speech` | speech fixture | done |
| Fonts | covered | `One.UI.Fonts` | fonts | done |
| Widgets/live activities | partial | iOS API exists; fixture lacks extension target | none | P2 |
| App updates | partial | `One.Updates` landed; iOS device proof pending | updates fixture | P1 |
| Keep awake/brightness | missing | no UIApplication/UIScreen service | none | P3 |
| Store review prompt | missing | no StoreKit review request | none | P3 |
| App shortcuts/intents | missing | no App Intents path | none | P3 |

## First batches

1. Biometrics landed with a deterministic Face ID simulator proof. Location
   permission and current position are next; the simulator can supply a fixed
   coordinate.
2. Imperative share and a general file API, preserving picker URLs and explicit
   errors for permission or security-scope failures.
3. Audio playback/recording and splash control. Verify launch timing and an
   actual audio session, not only successful method calls.
4. Continue P1 then P2. Update this matrix and the docs when each slice lands.

Avoid duplicating React Native surfaces only to rename them. Keep simulator
limitations explicit; hardware-only effects need a device proof before `covered`.
