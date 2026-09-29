# One native iOS API lane

Owner: `one-native-ios-apis`. Branch: `v2-beta`. Scope: iOS runtime APIs and their
One docs and simulator proofs. Contrast migration, Android implementations, and
direct Swift/Kotlin import belong to other lanes.

## Working rule

Take the highest useful missing API without a live owner. Ship its public types,
native implementation, docs, and an iOS 27 simulator proof together. Add a Peach
conformance check when Peach can simulate the observable behavior. Give each
assembled API batch one independent review by the model assigned for this lane
before pushing. Repeat from the matrix.

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
| Live camera preview and code scanning | partial | `One.iOS.CameraView` native preview, front/back selection, QR/barcode callbacks and permission gate; physical-device scan proof open | camera-preview: iOS 27 simulator permission, active/inactive, no-camera states; [Apple's AVCam guide](https://developer.apple.com/documentation/avfoundation/avcam-building-a-camera-app) says Simulator has no device camera, so preview/scan needs device proof | P1 |
| Photo selection | covered | `One.ImagePicker.launchLibrary`, `One.iOS.PhotosPicker` | image-picker; RAN iOS 27 web-photos: system Photos picker, selected 120×80 image copied to a readable local file | done |
| Image transformation | covered | `One.iOS.ImageManipulator` local crop, resize, rotate, JPEG/PNG encode | RAN iOS 27: orientation, decoded sizes, bytes, red crop/rotation pixels, input errors | done |
| Live Photos | partial | `PhotoLibraryAsset.isLivePhoto` identifies a paired asset and `One.iOS.LivePhotoView` displays and plays it with revisioned play/stop commands; no Live Photo capture or pair assembly | RAN iOS 27.1 Live Photo fixture: lane-generated paired 320×240 media imported as one `.photoLive` asset, metadata list/get, Photos permission prompt, nondegraded ready, `loading>ready>playing>ended` and replay `playing>ready` on stop; recorded view pixels changed 42.75% across 25 frames while the static control interior changed 0 pixels, and preplayback and stopped key-photo crops were identical; permission, blank ID, unknown ID, and ordinary-image failures asserted. RAN old native binary rejects missing Fabric registration | P3 |
| Photo library save/manage | partial | `One.iOS.PhotoLibrary` image/video save, read permission, bounded metadata list/get, original-file export, still-image and video content replacement/revert/current export, favorite updates, asset deletion, limited-selection picker, and user album create/list/rename/membership/delete; no iCloud transfer progress/cancel | RAN iOS 27 photo-library: both permission prompts, image/video save, list/get, original bytes, favorite round trip, delete confirmation/readback, errors; photo-library-limited: one selected asset, X cancel returns no IDs, picker reopens, one new saved ID returned/readable and visible count expands; album create/list/rename, bounded membership pages, remove and delete with asset preservation, real OS deletion alert, invalid inputs and missing IDs; still-image 80×120 to 60×90 replacement, decoded current bytes, exact preserved original bytes, revert to decoded 80×120, invalid cases; video 6s to 2s replacement, current QuickTime duration 2s, exact original bytes, revert to 6s, rotated video rejected, invalid cases | P2 |
| Foreground location and geocoding | covered | `One.iOS.Location` permission, one fix, watch, forward/reverse geocoding | location: prompt, movement, geocoding | done |
| Background location | partial | opt-in `One.iOS.Location.watchPosition(..., { background: true })` with `location` background mode; no region/significant-change monitoring or relaunch | RAN iOS 27: callback wrote a moved coordinate while Settings was foreground. RAN iOS 27.1 standalone probe: region monitoring unavailable and `startMonitoring` failed with kCLErrorDomain 5; significant-change availability true, but a 45-second simulated route while Settings was foreground produced no new background callback. INFERRED prolonged delivery and relaunch still need device proof | P2 |
| Maps | covered | `One.UI.Map`, `One.iOS.Map` with controlled MapKit Look Around viewer, `One.iOS.MapServices` place search, autocomplete with selected-place resolution, and walking/driving directions | RAN map and ui-map; RAN iOS 27 Look Around street imagery, system address/date/compass, Close and JS dismissal callback; RAN map-services Ferry Building search, suggestion and exact-place resolution, canceled query, invalid ID, 2082 m walking route, empty result and native input error | P2 |
| Share | covered | `One.iOS.Share` text, URL, and file sheet; `One.iOS.ShareLink` button | share: text/link, file preview, cancel and errors; ShareLink unproven | done |
| Clipboard | covered | `One.Clipboard` text | clipboard | done |
| Secure storage | partial | `One.SecureStore` key/value plus iOS `One.iOS.ProtectedStore` user-presence and current-biometry Keychain items; no access groups | iOS 27 SecureStore: 10 async/sync assertions and read after reboot; ProtectedStore: Face ID before every read/update/delete, both policies, round trip, input/duplicate/missing/auth errors; invalidation requires device proof. RAN iOS 27.1 access-group spike: ad-hoc signed shared-group app installed but could not launch; without the entitlement it launched and `SecItemAdd` returned -34018; studio had zero valid signing identities. INFERRED cross-app sharing needs team-signed device proof | P2 |
| Plain local database | covered | `One.Database` opens OP SQLite synchronously and asynchronously | database: parameterized query, delete, persisted row after relaunch | done |
| Plain key/value preferences | covered | `One.iOS.Preferences` string get/set/delete, async and sync, backed by namespaced UserDefaults | RAN iOS 27.1 preferences: missing/overwrite/empty value, async/sync shared state, deletion, invalid input, value survives relaunch and stays deleted after another relaunch | P3 |
| Biometrics | covered | `One.iOS.LocalAuthentication` policy status and biometric evaluation | local-authentication: unenrolled, enrolled, Face ID match | done |
| Apple sign-in | covered | `One.Auth.Apple` | apple-auth fixture | done |
| OAuth browser session | covered | `One.Browser.openAuthSession` | browser fixture | done |
| Cryptography and identifiers | covered | native global `crypto.getRandomValues`/`randomUUID`, `One.AppInfo` | crypto, app-info | done |
| Document picking | covered | `One.DocumentPicker` single and multiple selection, cached file URIs | apple-file: cancel and exact copied file bytes | done |
| File system | covered | `One.iOS.FileSystem` sandbox write/list/copy/move/delete; `fetch(file://)` reads | file-system lifecycle | done |
| Background tasks | partial | `One.iOS.BackgroundTasks` refresh/processing submit, pending readback, cancellation, and setup-file handlers with headless React Native startup; OS scheduling policy needs device proof | iOS 27 simulator scheduler-unavailable error, pending query/cancel, and injected native-to-JS launch/completion/expiration; successful submit and actual BGTaskScheduler launch/expiration need a device | P2 |
| Deep links | covered | One router and linking integration | router tests; external browser callback | done |
| App icons | covered | `native.app` generates primary and named alternate icon sets; `One.iOS.AppIcon` reads support/current selection and switches or resets the icon | RAN iOS 27 app-icon: alternate and primary system alerts display distinct bundled icons, UIKit selection readback, unknown-name rejection | done |
| In-app purchases | covered | `One.iOS.Purchases` StoreKit 2 product lookup, verified purchase, current entitlements, unfinished transaction recovery/finish, transaction updates, and App Store sync | RAN iOS 27 StoreKit Test: product lookup, injected transaction update, verified nonconsumable purchase, unfinished and entitlement readback, finish, JWS shape, and sync; cancellation, pending, subscriptions, consumables, and App Store policy remain device/App Store proofs | P2 |
| Audio playback/recording | partial | `One.iOS.Audio` permission, local/remote playback controls, AAC recording, interruption events, Now Playing metadata and remote command handlers; opt-in `audio` background mode | audio: prompt, record/play lifecycle; RAN iOS 27 39.4s background playback, but no-mode control also played 39.4s; RAN native interruption began/ended and paused playback; RAN audio-remote Nitro setup/update/clear calls, errors, and continued playback, but no system metadata readback; device proof remains for background policy, cross-app arbitration, visible media controls, tile removal, and remote command callbacks | P1 |
| Video playback | covered | `One.iOS.VideoPlayer` AVKit transport, programmatic play/pause/seek commands, playback state/position/duration events | RAN iOS 27 media: six-second local clip autoplay, native duration/progress, pause, seek to 4s, resize preserves position, end, replay, Quick Look regression; background playback, cross-app audio arbitration, and picture in picture need device proof | P2 |
| Picture in picture | partial | `One.UI.PictureInPicture`; video path needs device proof | simulator cannot enter PiP | P2 |
| Sensors and motion | partial | `One.iOS.Motion` Core Motion availability plus accelerometer, gyroscope, magnetometer, and fused device-motion subscriptions; physical-device readings remain unproven | RAN iOS 27 motion: simulator availability, four unavailable-stream errors, invalid interval; live readings need device proof | P2 |
| Battery and power state | missing | no battery level, charging state, or low-power state API | RAN iOS 27.1 standalone UIKit probe: battery monitoring began false and remained false after enabling; level stayed -1.000, state unknown, and low-power false on immediate and refreshed reads; simctl charging/25 status-bar override changed none of the app readbacks. Settings showed no Battery entry. INFERRED useful state proof needs a physical device | P3 |
| Cellular/SIM details | missing | `One.Network` reports connection type, not carrier or SIM data | none | P3 |
| Contacts | covered | `One.iOS.Contacts` permission, name search, create, update, delete, structured postal addresses, and system picker; notes require an Apple-granted entitlement | RAN iOS 27 prompt, create, full and partial edit, search, delete, postal address round trip, system picker selection and cancellation | done |
| Calendar and reminders | covered | `One.iOS.Calendar` event create, list, update, delete and reminders permission, list, create, completion, delete; both create daily, weekly, monthly, or yearly recurrence with a count or end date | RAN iOS 27 both prompts, event and reminder round trips, count-bounded and date-bounded event occurrences with rule readback, reminder rule readback, recurrence deletion and invalid input | done |
| Localization and locale | covered | `One.iOS.Device.getLocalizationInfo` returns locale, languages, calendar, time zone, UTC offset, and currency | RAN device suite on iOS 27: en-US, gregorian, Honolulu, UTC offset, USD | done |
| Screen orientation | covered | `One.iOS.ScreenOrientation` reads the active window scene, requests portrait or landscape locks, unlocks, and emits orientation changes | RAN iOS 27 iPhone 17 Pro: portrait read, landscape lock and 874x402 window, change event, portrait lock and 402x874 window, change event, unlock | done |
| Screen capture control | partial | `One.iOS.ScreenCapture` scene recording/mirroring state, post-capture screenshot event, app-window PNG capture, and individual React Native view PNG capture; no OS screenshot prevention | RAN iOS 27: real window scene starts inactive; injected UIKit capture trait active/inactive produces exact events; injected UIKit screenshot notification produces a timestamped Nitro callback, and remover blocks a second callback. RAN iOS 27.1 app-window PNG at native scale with red/blue view pixels, file metadata and deletion; view-only PNG at native scale with nested red/blue pixels, metadata and deletion. `simctl io screenshot` and `recordVideo` are host captures that did not change UIKit state or post its screenshot notification; physical screenshot/recording policy needs device proof | P2 |
| Print | partial | `One.iOS.Print` presents the iOS system print sheet for a readable local PDF; availability, cancellation, and one-sheet-at-a-time guard are covered; actual printer delivery remains open | RAN iOS 27.1 iPhone 17 Pro: 632-byte one-page PDF rendered in genuine system Options sheet with printer, copies, paper size, and page preview; Cancel settled `{ completed: false }`, removed the sheet, and a second concurrent request returned `E_PRINT_BUSY`; URI/file/PDF and JavaScript input errors also passed. No printer was available, so paper delivery needs a device and printer | P3 |
| Mail and SMS composer | partial | share sheet can hand off content; no configured message composer | RAN iOS 27.1 standalone MessageUI probe: `canSendMail=false` and `canSendText=false`, so no genuine compose sheet was presentable. INFERRED configured-device proof is required | P3 |
| App tracking permission | covered | `One.iOS.AppTracking` synchronous status and one-time App Tracking Transparency request | RAN iOS 27: configured system prompt, denial, concurrent requests, persisted status | done |
| Device attestation | partial | `One.iOS.DeviceAttestation` App Attest availability, key generation, attestation and assertion; DeviceCheck token; server validation remains app-owned | RAN iOS 27.1: both services unavailable on simulator, invalid key/hash input errors, and four unavailable operation errors; registered physical device needed for successful Apple operations | P2 |
| Bluetooth and NFC | missing | no CoreBluetooth or CoreNFC service | none | P3 |
| Web browser/auth session | covered | `One.Browser` | browser | done |
| Web view | covered | `One.iOS.WebView` local HTML and URL loading, navigation/title/loading events | RAN iOS 27 web-photos: document A to B title/loading/progress and pixel repaint | done |
| Native date/picker/slider/pager controls | covered | `One.iOS.DatePicker`, `Picker`, `Slider`, `Pager` | pickers, tabs-menu | done |
| Gesture and animation packages | partial | Gesture Handler 3 and Reanimated 4 work in a One native route when installed as app dependencies and wrapped in `GestureHandlerRootView`; they remain package APIs with no One facade | RAN iOS 27 gestures: native pan callback and Reanimated timing position; Android and other gestures unproven | P2 |
| Vector drawing and view snapshots | partial | `One.iOS.ScreenCapture.captureView` saves a mounted React Native view as a PNG; no One SVG/Skia drawing API | RAN iOS 27.1 Fabric view handle resolved to a mounted UIView; `drawHierarchy` produced a view-only PNG with nested red/blue pixels and pixel dimensions at native scale. RAN default Fabric flattening omitted the nested child; `collapsable={false}` on the target preserved it | P3 |
| Splash | covered | `One.LaunchScreen` first-content hold, synchronous `preventAutoHide()` at module evaluation, and `hide()` with optional iOS fade | RAN iOS 27 launch-screen: storyboard remained over rendered home content, JS link called hide and revealed fixture, second hide safe; normal setup without preventAutoHide failed held-state gate | done |
| Status bar | partial | React Native StatusBar, no One facade | none | P3 |
| Safe area | covered | `One.UI.SafeArea` | safe-area | done |
| Device identity | covered | `One.AppInfo` binary ID; `One.iOS.Device` model, OS, idiom, simulator, vendor ID | app-info, device | done |
| Network state/fetch | covered | `One.Network`, `One` fetch | network and fetch fixtures | done |
| Speech recognition | covered | `One.Speech` | speech fixture | done |
| Fonts | covered | `One.UI.Fonts` | fonts | done |
| Widgets/live activities | partial | iOS API exists; fixture lacks extension target | none | P2 |
| App updates | covered | `One.Updates` checks, downloads, stages, reloads, rolls back, and prunes OTA bundles | RAN iOS 27 release suite: 208 checks across eight publishes, rollback, 20 reloads, fallback, and rejection cases | done |
| Keep awake | covered | `One.iOS.KeepAwake` app-wide idle-timer flag with native readback; physical auto-lock policy remains device proof | RAN iOS 27.1 keep-awake: JS to Nitro to UIKit true/false readbacks, invalid boolean, initial value restored; old native binary failed exactly at missing registration | P3 |
| Brightness | missing | no screen-brightness API | RAN iOS 27.1 standalone UIKit probe: active scene screen began at 0.500; writes of 0.2 and 0.8 both read back 0.500 immediately and after 250 ms; restored 0.500. INFERRED simulator setter is inert; physical-screen proof needed | P3 |
| Store review prompt | covered | `One.iOS.StoreReview.requestReview()` passes a request to StoreKit in the active window scene; the system decides whether and when to show the prompt | RAN iOS 27.1 development simulator: baseline pixel check was empty; `AppStore.requestReview(in:)` displayed the genuine five-star system prompt, its central dark region and cyan stars passed a screenshot-pixel gate, Not Now removed the prompt, and the app remained usable. AX alone did not expose the overlay. TestFlight no-op and App Store frequency policy need distribution/device proof | P3 |
| Home Screen quick actions | covered | `One.iOS.QuickActions` replaces and reads dynamic Home Screen actions, receives warm selections, and reads/clears the cold-start selection; static-action configuration and App Intents remain separate | RAN iOS 27.1: genuine SpringBoard menu showed the registered item, two warm selections delivered exactly once each, terminated-app selection reached `getInitialAction` with no listener replay, explicit clear returned null, and replacing items with `[]` removed the OS menu entry; invalid input also rejected | P3 |
| App Intents and Siri Shortcuts | partial | `One.iOS.AppIntents` exposes build-time string actions to Shortcuts with setup-file handlers and 20-second native settlement; Siri voice, entities, and typed parameters remain open | RAN iOS 27.1: standalone AppIntent appeared in genuine Shortcuts search; warm invocation ran in PID 48681, cold invocation after termination ran in PID 66969 and returned the distinct string. One fixture proof pending. | P3 |

## First batches

1. Biometrics, foreground location, continuous updates, and geocoding landed
   with iOS 27 simulator proofs. Background location remains P2.
2. A general sandbox file API and imperative share sheet landed with iOS 27
   simulator proofs.
3. Audio playback/recording landed with an iOS 27 simulator recording and
   playback proof. Extend background and interruption handling before calling
   it covered. Splash control still needs a launch timing proof.
4. Add-only Photos saving landed with an iOS 27 image and video proof. Library management remains
   separate because it needs read/write permission and different privacy UX.
5. Device snapshot exposes the model family, system version, interface idiom,
   simulator status, and optional vendor ID on iOS 27. Peach has device profile
   data, but its OneDevice Nitro adapter belongs to the Contrast migration lane.
6. Continue P1 then P2. Update this matrix and the docs when each slice lands.
7. Reminders now have an iOS 27 EventKit proof. Peach's Expo Calendar stub has
   an in-memory reminder store; a targeted search found no `OneCalendar` adapter.
   The Contrast migration lane owns that bridge.
8. Image transformation has an iOS 27 Core Image proof. Peach's Expo Image
   Manipulator stub performs real pixel work, but no `OneImageManipulator`
   adapter exists; that bridge belongs to the Contrast migration lane.
9. Background audio configuration stamps the `audio` plist mode for One prebuild
   and the Expo plugin. The iOS 27 simulator played a 60 second local WAV for
   about 39.4 seconds in the background with and without the mode. That proves
   the API playback clock runs across app switching on the simulator, but it
   cannot prove the mode changes OS policy there. Apple documents the mode as
   required; device proof remains open. Peach has an Expo Audio HTML5 stub but
   no OneAudio adapter, and browser tab visibility is not iOS background policy.
10. Updates passed the iOS 27 release simulator suite with 208 checks: embedded
    launch, eight real publishes, bundle and image download, hash rejection,
    fatal rollback, splash-kill recovery, twenty reloads, missing-bundle
    fallback, cache pruning, and invalid manifest rejection. The isolated proof
    app kept only the Updates route and supplied a no-op entry for the unrelated
    native-source fixture package, which has no `@main`; the shipped code was
    unchanged by those proof accommodations. Peach simulates disabled Expo OTA
    state but has no `OneUpdates` adapter or OTA launcher simulation.
11. ProtectedStore passed its iOS 27 iPhone 16 simulator suite with a visible
    system authentication prompt before each protected read, update, and deletion.
    Three simulated Face ID nonmatches produced `E_PROTECTED_STORE_AUTH`. Toggling
    simulated enrollment off and on left an existing current-biometry item readable,
    so invalidation after a real enrollment change needs device proof. Peach has a `OneSecureStore`
    adapter and an Expo SecureStore simulation, but no `OneProtectedStore`
    adapter or enrolled-biometry Keychain simulation. That bridge belongs to the
    Contrast migration lane.
12. Audio remote media controls use an opt-in `MPNowPlayingSession` for the
    current player. The iOS 27 simulator proved Nitro metadata setup, update,
    and clear calls, native validation errors, and playback continuing through
    cleanup; it did not read back system metadata. A disposable diagnostic build
    reported session activation, but Control Center had no media tile and the
    Lock Screen did not show the track. The cause is unconfirmed. Visible system
    controls, tile removal, and command callback delivery need device proof.
13. Camera preview and code scanning have an iOS 27 permission and lifecycle
    proof. The simulator reports no device camera, so live frames, decoded
    values, lens choice, and landscape rotation need physical iPhone proof.
    Peach has an Expo Camera stream and barcode seam, but no `OneNativeCamera`
    Fabric adapter; the Contrast migration lane owns that integration.

Avoid duplicating React Native surfaces only to rename them. Keep simulator
limitations explicit; hardware-only effects need a device proof before `covered`.
