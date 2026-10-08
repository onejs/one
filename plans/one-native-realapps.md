# One native real-app matrix

RAN: Basic, Takeout Free and Contrast mobile pass clean installation, production web build/runtime, iOS 27.0 simulator build/run and Android 37 emulator build/run on the frozen One/vxrn family `2.0.0-0.canary.1791082782289` (`a4c1ed5a561604bdb05fed10540f8576591274ef`). Every imported One native API has a device receipt on its applicable platform. ArrangementView has a strict availability receipt on 27.0; its 27.1 rendering is the open pool gap described below. This is a call/behavior matrix, with each receipt stating its observed scope.

RAN: `create-vxrn/src/templates.ts` includes two cloneable starters: Basic at `origin/v2-beta-starter` and Takeout Free on its external main. Takeout Production is a commercial external link, not an included checkout. Testflight is an optional diagnostic example, outside the three-app launch matrix. The runner archives the actual Basic scaffold branch, rather than taking the changing beta checkout as its source.

| app | clean install and graph | web build/run | iOS 27 build/run | Android 37 build/run | imported native APIs |
| --- | --- | --- | --- | --- | --- |
| Basic | PASS | PASS, including `/tabs/profile` | PASS | PASS | 3/3 iOS calls |
| Takeout Free | PASS, frozen lock | PASS, original Login | PASS | PASS | 0 imports; routing and native utility round-trip pass |
| Contrast mobile | PASS, one physical One instance | PASS, onboarding/login; preview route guarded | PASS | PASS | 43/43 applicable API calls, including the 27.0 availability guard |

RAN: all three native apps run the same stack/tabs/drawer counter probe: initial 0, increment to 1, visit another screen, return to 1. Basic repeats the three navigators on Chromium after the production build. Its original Home, Tabs, Profile and Settings routes also render. [Web routing receipt](../tests/native-features/evidence/realapps/final/basic-web-routing.json). Native home/routing receipts for Basic and Takeout are retained beside it; Contrast routing output paths are in the final matrix JSON.

RAN: Takeout uses Expo 58 and RN 0.87.1 after the compatibility fixes. Its Android ARM64 clean build ran 615 tasks in 5m13s; its final frozen-patch iOS build took 108.7s. Contrast Android built every ABI in 13m40s (786 tasks); its clean iOS build took 700.7s. Basic Android ARM64 built in 3m12s (325 tasks). These are elapsed build observations, not controlled performance comparisons.

RAN: final Basic scaffold clean install took 2.6s; the plain production web build took 34.3s and four-route runtime 2.9s. The instrumented build and state-retention probes are separately retained. Contrast clean workspace installs resolved 3,235 packages on Pro64 in 32.9s and 3,233 on Studio64 in 18.6s. Final Contrast `bun check` passed in 65.5s, and its mobile template typecheck reported zero errors.

## retained proof and scope

Final receipts (local run output, not committed) contain API result values, exact source locations, package graph negatives/positives, native build output, routing receipts and captured preview hierarchies. [Earlier failures](../tests/native-features/evidence/realapps/diagnostic/negative-history.md) retain the original beta.168.1 matrix and complete failure excerpts. Temporary full build logs and install roots are named in [matrix.json](../tests/native-features/evidence/realapps/final/matrix.json).

RAN: Contrast authenticated as the existing `qa-ota-smoke@test.local` fixture and opened chat plus design on a standard iPhone 17 Pro, iOS 27.0. The retained command log asserts the composer/Pager and design controls; screenshots show the compact path without invoking ArrangementView. No Arrangement fallback was added.

RAN: after the platform entry fix, iOS mounts `HybridPeachPreviewViewComponent`, a `WKWebView`, and its compositor overlay. Android mounts `android.webkit.WebView`. The existing native-drawing setting is explicitly enabled on iOS. The initial container-only capture did not prove this and is superseded by the native view tree. The captures show preview loading; remote engine content is not claimed rendered. That engine mount/content work belongs to rank 1. The web entry omits the native preview because this template has no existing browser implementation for that host. Its unauthenticated browser receipt reaches the existing onboarding guard; production bundling proves the platform import boundary, not authenticated browser preview rendering.

RAN: Storage/SecureStore/Clipboard, notification permission/schedule/cancel, Updates runtime 84, native UI callbacks and imported platform leaves have exact result receipts. Basic Widgets/WidgetUI write and serialization complete, and LiveActivities returns a native identifier followed by update/end. These call receipts do not prove widget pixels, audible/physical haptics, microphone transcription, credential Apple sign-in or downloading an OTA. The account-free Apple action opens its system sheet and forwards the expected cancellation error.

Open gap approved by the manager: ArrangementView requires iOS 27.1. The standard iPhone 16/17 Pro pool only supports 27.0; the installed 27.1 runtime supports another form factor and rejects iPhone 17 Pro as incompatible. There is no pool exception. [Strict guard receipt](../tests/native-features/evidence/realapps/final/contrast-ios-arrangement-availability.json) proves the unsupported call, and the real compact app route proves it does not crash. 27.1 rendering remains open until a compatible pool runtime exists.

Android Pager return/draft and composer/IME proofs are owned by p56058 under r54227, as recorded in [the launch plan](one-native-launch.md#coverage-split). This matrix smoke-checks page callbacks and refers to that lane for the deeper contract.

## failures fixed at their causes

| failure output | cause and landed repair | final proof |
| --- | --- | --- |
| `Element type is invalid` / undefined `NavigationContent` | native alpha.44 floated to core alpha.40, whose builder returns `render(children)`. One migrated all five consumers and pins the whole matching navigation set (`81558502b`, `be1f4db59`); Basic scaffold pins landed at `bd6044cc3`. | clean Basic web/profile and three-platform navigation; same-install old-source negative |
| web reaches native `getHostComponent`; `PlatformColor` / native asset resolution | Contrast platform entries separate the preview host and native engine route; the local package declares its `react-native` entry. Dock color/asset lookup is iOS-only. Existing EdgeFade API replaces an invalid Mask prop; obsolete Portal setup is removed. | clean web routes and actual native host view trees |
| `Tried to register two views with the same name OneNativeSafeAreaProvider` | reachable workspace packages independently pinned beta.168.1 beside the canary. One/vxrn now use the shared catalog. The matrix checks exact family versions and physical One identity (`97a39b26c`). | old clean graph fails; fresh frozen graph and QA routes pass |
| Expo host reflection misses One notification listener / runtime; Android AGSL variable loop rejected | One now registers through Expo 58 native subscribers and uses constant-bound EdgeFade loops (`0ff4ea4e9`, `48a455106`, `126de7e4c`, in frozen a4 artifact). | notification and Updates runtime84 receipts; image/edge-fade/portal/pager device callbacks |
| Takeout missing SDK58 modules, React headers, removed RCTCxxBridge runtime access | SDK58/RN87 dependency family plus narrow upstream compatibility patches; native utility installs JSI bindings via the actual TurboModule callback. Takeout main `5488179` merges `4046b0be`. | fresh frozen install, both builds, native round-trip returns exact value |
| mobile template telemetry type omits `waiting` | its type now references the existing connection classifier type. | zero template type errors and full `bun check` |

RAN: the packed core alpha.34/alpha.40 builder and type diffs were read. One does not import the removed core metadata provider or core useComponent, and does not use the changed NavigationHelpers second generic. One Tabs still has its own stable component named NavigationContent; it wraps core render and is not the removed core member. [Audit](../tests/native-features/evidence/realapps/final/core-api-audit.txt).

TESTED: restoring only the old WebStack NavigationContent consumer on the same clean a4 install fails the production build with React error 130 and an undefined element; the published file is restored in a finally block. The unchanged package graph and repaired source then pass the build and three navigation state checks. [Negative output](../tests/native-features/evidence/realapps/final/navigation-old-consumer-negative.log).

RAN: Contrast main already advanced to One family `2.0.0-0.canary.1791084352120` (source `6b5302bdc`) for rank 5. The landing preserves that version and the other lane’s navigation patch/UI. Both current clean graph and current-main web routes pass. All 442 iOS, 85 Android, 91 C++, and 841 generated One native files match the tested a4 package byte-for-byte. ReactNavigation alpha.44/alpha.50 iOS pod sources and evaluated podspecs are equivalent; its alpha.50 checksum matches the clean compiled CI lock. The existing OTA runtime remains 84; no OTA delivery compatibility claim is made for Android.

RAN: Contrast repair `6268fc7068` landed through main merge `c98f5bd3cb` and is reachable from published main `0d7e3544f3`. The final harness additions landed on One v2-beta at `746f607cb`. Managers own the downstream release/build workflows; their remaining production engine delivery dependency is outside this host-call matrix.

## imported platform packages, for ranks 5 and 6

RAN: AST parsing follows application imports into shared workspace source and platform variants. It excludes type-only imports, comments, generated declarations, tests, and installed third-party internals. Basic has no direct platform-package imports. Full source locations are in [source-inventory.json](../tests/native-features/evidence/realapps/final/source-inventory.json). Counts below are importing source locations, not dependency counts.

| app | package/subpath | sites | first source location |
| --- | --- | --- | --- |
| contrast-mobile | `@callstack/liquid-glass` | 1 | `features/preview/nativeBundleModules.ts:114` |
| contrast-mobile | `@react-native/js-polyfills/console` | 1 | `helpers/nativeThemeCheck.ts:50` |
| contrast-mobile | `@react-navigation/bottom-tabs` | 1 | `features/preview/nativeBundleModules.ts:115` |
| contrast-mobile | `@react-navigation/core` | 1 | `features/preview/nativeBundleModules.ts:116` |
| contrast-mobile | `@react-navigation/native` | 1 | `features/preview/nativeBundleModules.ts:117` |
| contrast-mobile | `@react-navigation/native-stack` | 1 | `features/preview/nativeBundleModules.ts:118` |
| contrast-mobile | `@react-navigation/routers` | 1 | `features/preview/nativeBundleModules.ts:119` |
| contrast-mobile | `@shopify/react-native-skia` | 4 | `interface/design/skiaFrozenTreeRenderer.ts:1` |
| contrast-mobile | `react-native-gesture-handler` | 17 | `interface/tabs/ProjectTabs.tsx:108` |
| contrast-mobile | `react-native-keyboard-controller` | 13 | `interface/tabs/tabPageKeyboard.ts:2` |
| contrast-mobile | `react-native-nitro-modules` | 6 | `interface/preview/SootSimPreviewHost.native.tsx:43` |
| contrast-mobile | `react-native-reanimated` | 38 | `interface/tabs/ProjectTabs.tsx:109` |
| contrast-mobile | `react-native-safe-area-context` | 1 | `features/preview/nativeBundleModules.ts:106` |
| contrast-mobile | `react-native-screens` | 1 | `features/preview/nativeBundleModules.ts:108` |
| contrast-mobile | `react-native-svg` | 201 | `interface/tabs/PlatformActionIcon.tsx:3` |
| contrast-mobile | `react-native-svg/filter-image` | 1 | `interface/icons/base.ts:6` |
| contrast-mobile | `react-native-teleport` | 1 | `features/preview/nativeBundleModules.ts:111` |
| contrast-mobile | `react-native-url-polyfill/auto` | 1 | `setupNative.ts:9` |
| contrast-mobile | `react-native-webview` | 4 | `interface/preview/SootSimPreviewHost.native.tsx:44` |
| takeout-free | `expo-crypto` | 1 | `src/helpers/crypto/polyfill.native.ts:30` |
| takeout-free | `expo-splash-screen` | 1 | `src/interface/platform/PlatformSpecificRootProvider.native.tsx:1` |
| takeout-free | `react-native-gesture-handler` | 2 | `src/interface/platform/PlatformSpecificRootProvider.native.tsx:3` |
| takeout-free | `react-native-keyboard-controller` | 2 | `src/interface/platform/PlatformSpecificRootProvider.native.tsx:4` |
| takeout-free | `react-native-mmkv` | 1 | `src/features/storage/setupStorage.native.ts:2` |
| takeout-free | `react-native-reanimated` | 1 | `src/interface/toast/Toast.native.tsx:9` |
| takeout-free | `react-native-safe-area-context` | 6 | `app/(app)/home/(tabs)/feed/index.tsx:2` |
| takeout-free | `react-native-svg` | 16 | `src/interface/app/LogoIcon.tsx:1` |
| takeout-free | `react-native-worklets` | 1 | `src/interface/toast/Toast.native.tsx:18` |

INFERRED: immediate migration candidates are MMKV to One.Storage, Expo splash screen to One.LaunchScreen, safe-area-context to One SafeArea/insets, Teleport to One Portal, and app glass wrappers to existing One native glass/blur surfaces. Crypto/randomness, embedded WebView, SVG/filter graphics and keyboard control need their coverage owner to decide the remaining contract. Skia is the app GPU renderer. Gesture Handler, Screens and React Navigation are routing/runtime infrastructure; Reanimated and Worklets remain app animation/runtime choices. This survey proposes no new public One API and claims no blanket package replacement.

## rerun

Prerequisites: Bun/Node, Xcode iOS27 SDK, CocoaPods matching the lock, JDK17 and Android SDK/emulator, Maestro, plus the existing Contrast heavy wrapper and sim-claim tools. Use a standard iPhone16/17Pro pool simulator; the runner claims/releases its explicit UDID. Android Pager/IME deep proofs remain with their owner.

```sh
bun tests/native-features/scripts/realapps.ts \
  --version 2.0.0-0.canary.1791082782289 \
  --ios-sim <standard-iOS27-UDID> --android <emulator-serial>
```

Omit `--run-dir` for fresh sources and node_modules. Use `--phase inventory|install|web|ios|android` to run a platform, and `--run-dir <saved-run>` to diagnose that exact artifact. `--version` pins a canary because the beta/canary tags move. The default resolves the beta tag once. Every command/output and per-platform API result is retained in matrix.json/Markdown. A graph drift or missing API receipt exits nonzero; the explicit Arrangement rendering gap stays visible.

```sh
bun tests/native-features/scripts/realapps-navigation-negative.ts \
  <installed-Basic-root> <output-directory>
```

This optional negative control changes one file only in the private installed app, detaches Bun cache hardlinks first, requires the precise old-consumer failure, and restores the published bytes. Rebuild with `--phase web` afterward to repeat the positive.

## android media services proposal: Audio, PhotoLibrary, Contacts, Calendar

Status: APPROVED 2026-10-05 for bounded implementation by p60786, with
all 12 first-layer corrections folded below. Approval:
`/Users/n8/.team-machine/handoffs/one-beta-recovery/public-review-controls/media-approval.md`;
first-layer verdict frozen in `../first-layer-verdicts.txt` (task
t-muuqu7js-zh50). Branch `tm/beta-android-media`. Existing signatures
only; no new public API, no new look, no v2-beta merge by the worker.
Final assembled unit returns to p60786 once, routed by manager p61056.

Scope is the four services only, platform SDK and AndroidX only, reusing
the existing `native.app` config fields. Preserved holds: progressive and
Android backdrop blur constraints, unrelated parked work, existing web
delivery (`3d5841af0`), and the browser/C++ generated-binding CI failure
owned by p61056.

### source grounding (all read)

Specs (exact method counts, correction 1): `OneAudio.nitro.ts:48` (17
methods: getRecordingPermissionStatus, requestRecordingPermission, play,
getPlaybackStatus, pause, resume, seek, stop, startRecording,
getRecordingStatus, pauseRecording, resumeRecording, stopRecording,
addInterruptionListener, setNowPlayingInfo, clearNowPlayingInfo,
addRemoteCommandListener),
`OnePhotoLibrary.nitro.ts:38` (25: getAddPermissionStatus,
requestAddPermission, getReadPermissionStatus, requestReadPermission,
presentLimitedLibraryPicker, listAssets, getAsset, listAlbums, getAlbum,
createAlbum, renameAlbum, listAlbumAssets, addAssetToAlbum,
removeAssetFromAlbum, deleteAlbum, setFavorite, deleteAsset,
replaceImageContent, replaceVideoContent, revertAssetContent,
exportOriginalAsset, exportCurrentImage, exportCurrentVideo, saveImage,
saveVideo),
`OneContacts.nitro.ts:59` (7: getPermissionStatus, requestPermission,
pickContact, search, create, update, remove),
`OneCalendar.nitro.ts:59` (12: 6 events + 6 reminders). All four declare
`HybridObject<{ ios: 'swift' }>` today; all four gain
`android: 'kotlin'`.

Bridges: each `index.native.ts` throws outside iOS (`audio:33`,
`photo-library:14`, `contacts:19`, `calendar:24`); each `index.android.ts`
re-exports `./unavailable`; each `index.ts` is the landed web build with
`typeof window` SSR guards falling back to `unavailable`.

Swift semantics to mirror: `HybridOneAudio.swift` (564 lines: AVPlayer /
AVAudioRecorder, one operation at a time, `E_AUDIO_*` codes at :528-543,
file:// or https:// only, AAC `.m4a` under cache, interruption and remote
command listeners); `HybridOneContacts.swift` (425: CNContactStore,
`E_CONTACTS_*`, name+limit validation, label-preserving update);
`HybridOneCalendar.swift` (515: EventKit, `E_CALENDAR_*`, 366-day range,
limit 1..500, occurrence keyed by identifier + startMs, RRULE from
frequency/interval/one end); `HybridOnePhotoLibrary.swift` (767:
PhotoKit, `E_PHOTO_LIBRARY_*`, add vs read split, bounded pages newest
first, album readonly rejection).

Kotlin pattern: `HybridOneImagePicker.kt` (pending slot under lock,
`isCameraDeclared` manifest check at :346, `E_FAILED` via `OneNativeError`,
FileProvider cache copies, cancel-resolve vs failure-reject split,
teardown rejects). No `HybridOneAudio/PhotoLibrary/Contacts/Calendar.kt`
exists today.

Prebuild: `nativeAppManifest.ts:52-88` already defines `imagePicker`,
`photoLibrary`, `contacts`, `calendar`, `audio`, `speech`; Android
stamping in `prebuildWithoutExpo.ts:2087-2113` covers only CAMERA and
speech RECORD_AUDIO; iOS usage strings at :2418-2451; `expo-plugin.cjs`
mirrors validation (:24-26, :52-100). No new config fields are proposed.

Docs: availability paragraphs in `audio.mdx:127`, `calendar.mdx:130`,
`contacts.mdx:62`, `photo-library.mdx:45`; `platform-support.mdx:30`
marks Photo Library Android "unsupported (throws)". SDK floor:
`packages/one/android/build.gradle:47,53,54` (compile 35, min 23,
target 35); no media3/exoplayer dependency.

Codegen (correction 10): `nitro.json` holds iOS-only entries for all
four. Regenerate with `bun run nitrogen` (nitrogen 0.37.0,
`packages/one/package.json:211`) run in `packages/one`; outputs are the
checked-in `packages/one/nitrogen/generated/android/{kotlin,c++}` specs
plus `OneOnLoad` and autolinking files, committed in the same change. No
`nitrogen:check` command exists; staleness and drift are proven by
`bun run generate:check` in `packages/one` (`package.json:210`) with the
regen outputs checked in, plus the real Kotlin proof-app compile.

Runtime harness: iOS conformance already proves Contacts/Calendar flows
(`one-native-conformance.ts:3752-3876`); Android uiautomator harness is
`one-native-conformance.android.ts`; proof screens exist for all four
(`fixtures/one-native-{audio,calendar,contacts,photo-library}.tsx`).

### WIP assessment (r58416, `6cef650ba`)

RAN: the WIP is registration-only (nitro.json android entries, spec
`android: 'kotlin'`, bridge re-exports, guard removal). Its method
split is correct against platform reality (Audio 17/17, Contacts 7/7;
Calendar keeps the 6 reminder methods unavailable; PhotoLibrary keeps 8
methods unavailable: create/rename/add/remove/delete album, replace
image/video, revert), but correction 9 replaces the Audio/Contacts
re-export shape with `index.android.ts` deletion per the `browser/`
pattern. Missing: all Kotlin, nitrogen regen, Android manifest stamps,
docs, and every runtime proof. Do not cherry-pick; re-derive the
corrected shapes so review covers the full diff.

### per-service plan

Audio, all 17 available. Kotlin over platform APIs only
(MediaPlayer, MediaRecorder, AudioManager, MediaSession; no
media3/exoplayer dependency exists and none is added): MediaPlayer for
play/pause/resume/seek/stop/status, MediaRecorder for
start/pause/resume/stop/status, AudioManager focus listener feeding
interruption began/ended + shouldResume, MediaSession for now-playing
metadata and play/pause/seek commands. RECORD_AUDIO stamped from
existing `audio.microphone`; without it every recording call rejects
`E_AUDIO_MANIFEST`, without grant `E_AUDIO_PERMISSION`. Keep the Swift
contracts exactly: file:// or https:// only (`E_AUDIO_URI`;
`content://` and every other scheme is rejected, matching
`HybridOneAudio.swift:498-505`), missing file (`E_AUDIO_FILE`), finite
nonnegative seek (`E_AUDIO_POSITION`), nonempty title
(`E_AUDIO_METADATA`), existing image artwork (`E_AUDIO_ARTWORK`), AAC
`.m4a` under cache with empty-file rejection
(`E_AUDIO_FAILED`), ended restarts from zero on resume, and the exact
status/interruption/seek/stop/recording lifetimes and payloads.

Busy matrix (correction 5, from Swift): `play` while a recorder exists
rejects `E_AUDIO_BUSY`; `startRecording` while a player or recorder
exists rejects `E_AUDIO_BUSY`; pause/resume/seek/stop with no player
reject (`pause`/`resume`/`seek`) or no-op (`stop`) per Swift state
handling; pause/resume/stopRecording with no recorder reject
`E_AUDIO_STATE`.

Focus-to-interruption table (correction 5, from
`HybridOneAudio.swift:336-353`): any focus loss emits began with
`shouldResume: false` and pauses both player and recorder;
`AUDIOFOCUS_GAIN` after a transient loss emits ended with
`shouldResume: true`, after a permanent loss ended with `false`.
`LOSS_TRANSIENT_CAN_DUCK` pauses like Swift's began (no ducking
mode exists in the contract). No other focus change emits.

Background playback only under the existing
`native.app.audio.background` (correction 5, approval): prebuild stamps
`FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MEDIA_PLAYBACK` and a
`mediaPlayback`-type foreground service when `audio.background` is
true; Kotlin starts that service with its notification on `play` and
stops it on pause/stop/ended. Without the config, playback pauses when
backgrounded and no service starts. No new background-recording
capability: recording never starts a service.

PhotoLibrary, 17 available / 8 unavailable. Available via MediaStore:
add/read permission split, list/get assets, list/get albums from
MediaStore buckets, listAlbumAssets, setFavorite (`IS_FAVORITE`),
deleteAsset, export original/current image/current video via
content-resolver copies to cache, saveImage/saveVideo via MediaStore
insert. Unavailable, keeping the exact `unavailable.ts` contract per
method: createAlbum (rejects `missingNativeBuild`), renameAlbum,
addAssetToAlbum, removeAssetFromAlbum, deleteAlbum, replaceImageContent,
replaceVideoContent, revertAssetContent (all no-op resolves). All 8
unsupported collection/shared/cloud mappings stay unavailable
(approval).

Permissions: API 33+ `READ_MEDIA_IMAGES` + `READ_MEDIA_VIDEO` from
existing `photoLibrary.readWrite`; below 33 `READ_EXTERNAL_STORAGE`
with maxSdkVersion 32. Reads without grant reject
`E_PHOTO_LIBRARY_PERMISSION`; saves reject `E_PHOTO_LIBRARY_MANIFEST`
only when neither `photoLibrary.addOnly` nor `photoLibrary.readWrite`
is configured, and `E_PHOTO_LIBRARY_PERMISSION` without add or read
grant, mirroring Swift `save`. Add-only config stays required even
though API 29+ needs no storage prompt for inserts; below 29 the write
permission is explicit and version-bounded (approval, ask 2 accepted).

Identifiers (correction 3): the MediaStore content URI string for the
row (stable while the row exists). Unknown or malformed identifiers
reject `E_PHOTO_LIBRARY_NOT_FOUND`, blank identifiers
`E_PHOTO_LIBRARY_INPUT`, matching `readableAsset`/`readableAlbum`.
Paging keeps the Swift rule: offset 0..1000000, limit 1..100 integers
(`E_PHOTO_LIBRARY_INPUT`), newest-first by creation date, `totalCount`
counting visible assets. Permission mapping (correction 3): full grant
`authorized`, partial (user-selected) `limited`, never-asked
`notDetermined`, denied `denied`; album reads require full access like
Swift `requireAlbumAccess`.

setFavorite/deleteAsset (correction 4): on API 30+ use
`MediaStore.createFavoriteRequest` / `createDeleteRequest` and the
system consent intent; confirmation resolves after an independent
re-read proves the mutation, cancellation rejects without fabricating
updated/deleted state. Below 30, setFavorite rejects
`E_PHOTO_LIBRARY_UNSUPPORTED` (no favorite column contract) and
deleteAsset deletes directly where the platform allows; consent floors
stay honest below their support level (approval).

`presentLimitedLibraryPicker` (correction 2, approval overrides the
first-layer all-visible recommendation): on API 34+ only, snapshot
accessible IDs before, request `READ_MEDIA_VISUAL_USER_SELECTED` with
the applicable media permissions, re-read grants on resume, and return
newly granted additions only (after-minus-before); cancellation or a
no-op reshow returns `[]`. Below 34 resolve `[]`, which matches
`unavailable.ts` and preserves the contract. The proof seeds previously
visible assets so returning the entire visible set fails the control.
Docs record that the return is newly selected IDs, matching
`photo-library.mdx:63-65` and Swift. If a supported implementation
cannot preserve this meaning, the method stays unavailable.

Contacts, all 7 available. Kotlin over ContactsContract: READ_CONTACTS +
WRITE_CONTACTS stamped from existing `contacts.usage`; without it every
gated call rejects `E_CONTACTS_MANIFEST`, without grant
`E_CONTACTS_PERMISSION`. pickContact via `ACTION_PICK` on
`Contacts.CONTENT_URI`, resolving `undefined` on cancel and rejecting
`E_CONTACTS_PICKER` when busy or with no activity. Result plumbing
(correction 7, approval): one pending slot under a lock following the
`HybridOneImagePicker.kt:40-48` precedent, settled only under the lock;
a second call while one is pending rejects `E_CONTACTS_PICKER`,
cancellation resolves `undefined` and releases the slot, and teardown
or lifecycle retirement rejects the pending promise so nothing hangs.
search matches names with whole-number limit 1..100; create requires a
given or family name and rejects blank phones/emails and invalid
addresses (`E_CONTACTS_INPUT`); update replaces supplied arrays whole,
keeps existing labels for unchanged values, defaults new labels, empty
array clears; remove rejects unknown identifiers
(`E_CONTACTS_NOT_FOUND`). Android has no limited tier: never return
`limited`; map granted/denied directly and `notDetermined` before
first ask.

Calendar, 6 events available / 6 reminders unavailable. Events via
CalendarContract: READ_CALENDAR + WRITE_CALENDAR from existing
`calendar.usage`; list over the actual Instances table, increasing
range up to 366 days, whole-number limit 1..500, sorted by start.
Writable selection (correction 6): create targets the default writable
calendar (primary visible writable calendar, `CALENDAR_ACCESS_LEVEL`
owner/contributor); with none available reject
`E_CALENDAR_UNAVAILABLE`, matching Swift. RRULE is built from frequency
+ whole-number interval + one valid end (`E_CALENDAR_INPUT`
otherwise). Update/remove address the occurrence keyed by (identifier,
originalStartMs); single-occurrence edits become exceptions
(`ORIGINAL_ID` + `ORIGINAL_INSTANCE_TIME`) so siblings are retained,
all-day keeps UTC day boundaries, and event time zones round-trip.
Update returns the re-queried updated `CalendarEvent` (correction 6).
Reminders keep the exact `unavailable.ts` contract: denied permission
getters, empty list, create rejects, completion/deletion no-ops. No
Android reminders provider exists, so this stays honestly unavailable.

Shared bridge edits: `nitro.json` gains the 4 android entries (kept in
this branch for manager-serialized integration; never touch peer
entries); 4 specs gain `android: 'kotlin'`; nitrogen regen; 4 new
`HybridOne*.kt` files; `index.native.ts` guards drop the iOS-only throw
so Android loads the same hybrid. Bridge shapes (correction 9): DELETE
`audio/index.android.ts` and `contacts/index.android.ts` following the
`browser/` full-availability pattern (no `index.android.ts` file);
PhotoLibrary and Calendar keep per-method `index.android.ts` splits
over `unavailable.ts` (8 methods each). `unavailable.ts` files remain
for the web/SSR fallback. Prebuild stamps the 4 permission sets plus
the audio FGS service/permissions under `audio.background`, mirrored
in `packages/vxrn/expo-plugin.cjs` (correction 8), with cases in
`prebuildWithoutExpo.test.ts`. Docs update the 4 availability
paragraphs and the `platform-support.mdx` Photo Library row (plus the
newly returned delta note for the limited picker); no web table
changes.

### runtime proof (after approval)

Device: Android 37 emulator claimed through the manager (no duplicate
builders; `bun heavy`/shared builder wraps builds). Reuse the 4 proof
screens; seeds are the candidate fixture
`tests/native-features/fixtures/one-native-android-media-seeds.json`
(deterministic contact, event + recurrence, photo/video blobs; audio
labels the 60s WAV as the playback input fixture and the AAC `.m4a`
cache file as the record output, resolved from
`tests/native-features/fixtures/`, correction 11).

Baseline first: capture current Android receipts (denied permissions,
empty pages, `missingNativeBuild` rejects) before Kotlin lands, so the
repair is measured, not asserted.

Positive: every available method exercised once against seeds, with
independent reads (query back the created contact/event/asset; decode
the recording; byte-compare exports).

Negative controls, each must fail before / pass after in the stated
direction: adb revoke mid-suite then denial and re-grant; permission
request cancellation; missing `native.app` config build proving
`E_*_MANIFEST`; invalid inputs proving `E_*_INPUT` (empty title, bad
range, limit 0/501, blank phone); picker cancel resolving `undefined`;
rotation with a pending picker proving teardown-reject without hang;
pre-fix Kotlin-absent run proving the harness actually loads the native
module; unavailable methods asserting byte-equal behavior with
`unavailable.ts`; SSR run proving the web/SSR contracts unchanged.

Compile evidence is a real Kotlin build (proof-app assemble on the
claimed emulator), never inferred from TS registration. Drift gate:
`bun run generate:check` in `packages/one` plus nitrogen outputs
checked in. Receipts land under
`tests/native-features/evidence/one-native-android-media/`.

### implementation findings (all device-proven, Android 37 emulator)

Calendar: the provider ignores EXDATE/RDATE in every tested form and
suppresses sibling expansion for linked ORIGINAL_ID exceptions, so
single-occurrence update/delete splits the series into runs around the
instance (RRULE rewrite only) with the edit carried in a detached
event. Middle-occurrence delete/update keeps both siblings listed
(`siblingsKeptAfterUpdate/Delete`, `middleRemoved`).

PhotoLibrary: saves must use `VOLUME_EXTERNAL`, the same volume the
listings query, or saved identifiers never match their own listing.
A partial grant reports granted at every layer (check, results,
appops; full grants triple-grant `USER_SELECTED` too), so status
echoes the OS and partial visibility is proven behaviorally
(strict before/after delta, never the status label). Re-requesting
permissions cannot reshow the manager (framework: "no requestable
permission", instant empty resolve), and Settings radios offer no
selection grid, so `presentLimitedLibraryPicker` chains: snapshot,
app-settings for user revoke, auto re-request on return whose dialog
reopens the manager with the remembered selection, then diff. Cancel
backs out unchanged and resolves `[]`. iOS keeps its native sheet;
same delta contract. iOS conformance exact-matches need `; strict=`
appended (tap1 `strict=false`, tap2 `strict=true`) after this lane
lands the approval-mandated strict field.

### bounded file list

Plan + fixture now; implementation: `packages/one/nitro.json` (4
entries), 4 specs, 4 `HybridOne*.kt`, 4 `index.native.ts` (guard
removal), Photo/Calendar `index.android.ts` splits only (Audio/Contacts
`index.android.ts` deleted per correction 9),
`packages/utils/src/nativeAppManifest.ts` (comments),
`packages/vxrn/src/exports/prebuildWithoutExpo.ts` + test,
`packages/vxrn/expo-plugin.cjs` (correction 8), 4 doc pages,
`platform-support.mdx`, nitrogen regen outputs, evidence dir. No other
services, no Contrast/Tamagui reads, no Air32. The section stays in
this file (correction 12).

### review asks, decided by approval

1. `presentLimitedLibraryPicker`: delta (newly granted IDs) on 34+,
   `[]` below; all-visible rejected. 2. Add-only config required even
   though API 29+ inserts need no prompt; below 29 explicit bounded
   write permission. 3. `setFavorite` rejects
   `E_PHOTO_LIBRARY_UNSUPPORTED` below API 30; delete consent floors
   stay honest below support. 4. Now-playing uses MediaSession; the
   foreground notification exists only under `audio.background` with
   the prebuild-stamped service owning it.
