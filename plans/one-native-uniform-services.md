# Uniform native services

Owner: s8377 / one-native-android-modules. Assembled review: m19584.

Nate approved moving uniform services to One root, removing their One.iOS aliases.
One.iOS retains existing generated iOS views and framework mappings. No new iOS
framework wrapper is written to fill a missing mapping.

## Root services

`One.Widgets`, `One.LiveActivities`, `One.LocalAuthentication`, `One.ProtectedStore`, `One.KeepAwake`, `One.Print`, `One.StoreReview`, `One.QuickActions`, `One.Location`, `One.FileSystem`, `One.Audio`, `One.Share`, `One.PhotoLibrary`, `One.MapServices`, `One.AppTracking`, `One.AppIcon`, `One.ScreenOrientation`, `One.ScreenCapture`, `One.Purchases`, `One.ImageManipulator`, `One.Device`, `One.Motion`, `One.BackgroundTasks`, `One.AppIntents`, `One.DeviceAttestation`, `One.Contacts`, `One.Calendar`.

FileSystem, ImageManipulator, and Motion have Kotlin Nitro implementations.
The other 24 namespaces share one unavailable implementation between Android,
web, and SSR. Effects do nothing; reads return empty or denied results; required
results reject with `<Namespace>.<verb> needs an iOS or Android build`.
Authentication, protected storage, purchase verification, and attestation fail
closed. Existing signatures and iOS implementations remain intact.

## Generated iOS mapping gaps

RAN: inspected `packages/one/codegen/catalog.ts`, its domain catalogs, the generator
README, and `packages/one/src/one.ts`. Generation currently emits SwiftUI views and
modifiers. None of the 27 moved services has a generated exact service/framework
namespace. All 27 service mappings are gaps. Related generated views remain,
including ShareLink, Map, PhotosPicker, LivePhotoView, VideoPlayer, FileImporter,
and QuickLook. Existing WidgetUI remains the iOS widget view tree. These views do
not provide Foundation filesystem, CoreMotion manager, Photos library, or the
other full framework service surfaces.

## Evidence

RAN: vxrn 258/258 at rebuilt `3b3e99560^` and `69591350d`; no failure attributed
to worklets. Reports live in `tests/native-features/evidence/native-modules/engine`.

RAN: Android parity at native `3e4ba9152`, fixtures `7e5e4db02`: file operations
and failures, all eight EXIF transforms, independent pixel and transparency
assertions, and concurrent motion subscriptions passed. The fixed wall-clock
anchor preserved the existing strict subscription interval assertion.

RAN: iOS SDK 27.1 generic simulator build succeeded at native `3e4ba9152`.
Root namespace runtime proofs on Android and an iOS 27 simulator are pending.
Local simulator launch stalled before the app started; this is no runtime proof.
No speed benchmarks were run.

RAN: docs props/type drift and the unavailable SSR contract passed 125 tests after
shared callback and task argument checks were extracted. Native runtime checks pending.
Contrast caller migration: `fix/one-native-uniform`, initial `064d31d326`.
Installed-package validation and assembled review are pending.
