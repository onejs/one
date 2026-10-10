# One Native Expo service parity

Owner: Expo services lane. Coordinator and CI owner: native-lead (p63991).
Branch: `fix/one-expo-services`, based on `origin/v2-beta` at `9d231baad`.
Date: 2026-10-05.

## Direction and boundary

Goal (2026-10-05): get One Native launch ready.
The services slice covers common Expo packages beyond `@expo/ui`, iOS first and
Android counterparts second. The broader direction is quoted in
[One Native coverage](one-native-coverage.md). This is a capability comparison,
not a download ranking, a percentage, or an import-compatible replacement claim.

Use existing One APIs and fixtures. A new public API is a product decision under
the global contract. This lane repairs existing contracts and records additions
for coordinator routing. Compose, SwiftUI coverage and the launch checklist have
separate owners.

## Comparison

**RAN:** read One's native exports, Nitro specs and selected implementations on
the baseline above, and the official Expo SDK 57 documentation linked in each
row. **INFERRED:** the capabilities and gaps below follow from those declared
methods and platform guards. A row denotes implemented code, not a fresh device
pass. A contradictory public method or successful guarded platform call would
invalidate its corresponding gap; inspect those sources before expanding it.

| Expo package | Existing One capability | Material gap or difference |
| --- | --- | --- |
| [FileSystem](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/) | `FileSystem` file/directory info, write, copy, move, delete on iOS/Android; native `fetch` reads files | no File/Directory classes, synchronous reads/writes or FileHandle streams; iOS malformed-base64 defect repaired below |
| [Clipboard](https://docs.expo.dev/versions/v57.0.0/sdk/clipboard/) | `Clipboard.getString/setString/hasString`, both platforms | string only; no image, HTML, URL or change-listener methods; method names differ |
| [SecureStore](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/) | async/sync string CRUD on Keychain and AndroidKeyStore; `ProtectedStore` separately supplies per-use authentication policies | SecureStore itself has no authentication, access-group, service or accessibility options; ProtectedStore has a different contract |
| [ImagePicker](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/) | image/video library picks, selection limit, still camera and camera permissions on both | no picker crop UI, EXIF/base64 options or camera video; camera video explicitly rejects |
| [DocumentPicker](https://docs.expo.dev/versions/v57.0.0/sdk/document-picker/) | system document selection on both | compare One options/result when migrating; package APIs differ |
| [ImageManipulator](https://docs.expo.dev/versions/v57.0.0/sdk/imagemanipulator/) | crop, resize, rotate, JPEG/PNG output on both | no declared flip or WebP output |
| [WebBrowser](https://docs.expo.dev/versions/v57.0.0/sdk/webbrowser/) | browser/auth sessions, dismissal, warmup and mayLaunchUrl on both | Browser is the browser transaction; Expo AuthSession's OAuth request/token helpers are a separate capability |
| [Audio](https://docs.expo.dev/versions/v57.0.0/sdk/audio/) | one playback/recording service, seek, interruptions, Now Playing and remote commands on both | no per-player instances, playback-rate API or configurable recording presets in the One spec |
| [Camera](https://docs.expo.dev/versions/v57.0.0/sdk/camera/) | iOS `CameraView` preview and barcode events; ImagePicker handles system still capture | CameraView rejects Android; no embedded-view photo/video capture methods |
| [Notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/) | permissions, scheduling, foreground handler, device push tokens/events and Android channels | native APNs/FCM tokens, no Expo push-service token; no declared interactive category API |
| [Location](https://docs.expo.dev/versions/v57.0.0/sdk/location/) | permission, current position, watches and forward/reverse geocoding on both | no declared geofencing API; Expo task-manager lifecycle differs from One listener lifecycle |
| [MediaLibrary](https://docs.expo.dev/versions/v57.0.0/sdk/media-library/) | PhotoLibrary permissions, save, asset/album browsing, delete and export | iOS has richer album/content editing; Android collection/content-edit operations retain unavailable contracts |
| [Contacts](https://docs.expo.dev/versions/v57.0.0/sdk/contacts/) | permissions, pick, search, create/update/delete on both | One's contact fields/queries are narrower; compare the contact DTO rather than assuming import compatibility |
| [Calendar](https://docs.expo.dev/versions/v57.0.0/sdk/calendar/) | event CRUD on both; reminders on iOS | Android reminder operations retain unavailable contract; no declared calendar-management methods |
| [SQLite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/) | `Database.open/openAsync` expose OP-SQLite on native | a different database API; Expo prepared statements, hooks and migrations need an explicit migration |
| [Crypto](https://docs.expo.dev/versions/v57.0.0/sdk/crypto/) | installs standard `crypto.getRandomValues/randomUUID` from the shared C++ source | no One digest or AES public methods; this is not full Expo Crypto coverage |
| [Device](https://docs.expo.dev/versions/v57.0.0/sdk/device/) and [Localization](https://docs.expo.dev/versions/v57.0.0/sdk/localization/) | `Device.getInfo/getLocalizationInfo`, both | snapshots cover selected identity/localization fields; no declared live locale hook |
| [Font](https://docs.expo.dev/versions/v57.0.0/sdk/font/) | Fonts load/isLoaded and useFonts, both | a counterpart; this audit did not run font/device rendering |
| [Haptics](https://docs.expo.dev/versions/v57.0.0/sdk/haptics/) | selection, five impact styles and three notification types, both | Apple-shaped vocabulary; no declared Expo AndroidHaptics enum API |
| [Network](https://docs.expo.dev/versions/v57.0.0/sdk/network/) | getState and state listener, both | narrower declared service; not all Expo network utilities |
| [KeepAwake](https://docs.expo.dev/versions/v57.0.0/sdk/keep-awake/) | isEnabled/setEnabled, both | a single flag rather than Expo activation tags |
| [ScreenOrientation](https://docs.expo.dev/versions/v57.0.0/sdk/screen-orientation/) | get/lock/unlock/listen, both | One defines its own values and lock contract |
| [ScreenCapture](https://docs.expo.dev/versions/v57.0.0/sdk/screen-capture/) | capture state, screenshot listener and PNG view/window capture, both | no declared prevent/allow-screen-capture API |
| [SplashScreen](https://docs.expo.dev/versions/v57.0.0/sdk/splash-screen/) | LaunchScreen preventAutoHide/hide, both | counterpart uses One prebuild and synchronous methods |
| [StoreReview](https://docs.expo.dev/versions/v57.0.0/sdk/storereview/) | iOS requestReview | Android retains unavailable contract; Expo supports Android review requests |
| [BackgroundTask](https://docs.expo.dev/versions/v57.0.0/sdk/background-task/) | iOS BackgroundTasks submit/list/cancel/complete and JS task registration | no Android Nitro implementation; Expo uses WorkManager there |
| [Speech](https://docs.expo.dev/versions/v57.0.0/sdk/speech/) | One.Speech recognizes microphone speech on both | Expo Speech synthesizes speech; there is no One text-to-speech counterpart |
| [Sensors](https://docs.expo.dev/versions/v57.0.0/sdk/sensors/) | Motion accelerometer, gyroscope, magnetometer and deviceMotion, both | no declared barometer, pedometer or light-sensor API |
| [Battery](https://docs.expo.dev/versions/v57.0.0/sdk/battery/) | no root export or corresponding Nitro spec in this audit | new public capability |
| [Brightness](https://docs.expo.dev/versions/v57.0.0/sdk/brightness/) | no root export or corresponding Nitro spec in this audit | new public capability |

One evidence sources: `src/platform/index.native.ts`, `extras.ts`, each
`specs/One*.nitro.ts` above, `camera/index.native.tsx`, `database/index.native.ts`,
`crypto/index.native.ts`, `image-picker/options.ts`, and the Calendar/PhotoLibrary
platform splits. The old "Beyond SwiftUI" table in `one-native-coverage.md` marks
several implemented services as not started. Use this audit and current source
for service routing; that historical table does not establish launch status.

## Repair: invalid FileSystem writes

**RAN:** the unmodified production Swift class compiled in the Foundation harness.
`testMalformedBase64RejectsBeforeCreatingOrReplacingFile` failed; valid writes and
file lifecycle passed. The baseline emitted
`XCTAssertThrowsError failed: did not throw an error - ====` (also for `AA=A` and
`AAAA=`), with on-disk preservation assertions failing. Foundation accepted `====`, `AA=A` and `AAAA=`. Those calls
created a missing file or overwrote an existing one instead of rejecting.

The iOS implementation now checks length and the same standard alphabet/trailing
padding structure already used by Android before decoding or writing. It rejects
with the existing `E_FILE_ENCODING` code. Empty input and properly padded input
still write normally. No public signature or generated transport changes.

The shared native-features fixture tests ten invalid values against both an
existing binary and a missing destination, verifies the error code, and checks
that bytes remain unchanged and no rejected destination exists. The current
conformance result string stays intact, so the existing device runner includes
these checks before it can report success.

Cost: one linear string validation before base64 decoding on the filesystem's
background queue; no additional JS/native calls or dependencies in shipping code.
The harness is isolated from the shipped pod. No device performance claim.

## Validation and delivery

**RAN:** `tm window run heavy -- swift test --package-path packages/one/ios/Tests/FileSystem`:
three tests passed after the fix. Real Foundation operations run through the
production class; Nitro Promise/spec/value types are test stand-ins.

**RAN:** the same production Swift source also builds for
`arm64-apple-ios18.0-simulator` against the installed iOS 27 SDK through this
harness (`swift build --triple ... --sdk ...`). This checks iOS compilation with
transport stand-ins, not the full pod or app.

**RAN:** `bun run vitest --run tests/clipboard.test.ts tests/secure-store.test.ts tests/image-picker.test.ts tests/unavailableServices.test.ts`
from `packages/one`: 30 tests passed in four files.

**RAN:** Bun bundled the shared FileSystem fixture and Android conformance runner
successfully. This proves syntax/bundle generation, not Android execution.

Pending delivery evidence: full app/Nitro consumer build and native-features
`file-system` device suite on iOS 27, then the Android `system` suite's new
FileSystem leg on Android 37.
The host test is not a device pass. CI owner p63991 follows `iOS Native Tests`
consumer compilation and the selected device receipts after this lane finishes.

Next service lanes to route: Android CameraView, StoreReview and BackgroundTasks
(existing names); iOS-first text-to-speech, battery and brightness need a concrete
public API proposal; file streams and media/audio option expansion need contracts.
Launch language should name the supported subsets until those capabilities and
runtime proofs exist.
