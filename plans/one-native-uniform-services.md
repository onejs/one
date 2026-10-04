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
TESTED: Android root namespace contracts passed at namespace `87b1cf2b3`: all
three native modules, 68 operations across the other 24 unavailable namespaces,
independent pixel/transparency checks, seeded motion vectors, and a rejected
wrong-rotation negative control. Screenshot inspected.
TESTED: refreshed Android root proof at `554606413` and iOS 27.0 runtime / 27.1 SDK root proof at
`87d1ddd50` passed the shared exact filename and listed-URI roundtrip, native
contracts, independently decoded image pixels, transparency, and wrong-rotation
negative control. Android also passed 68 unavailable-service operations and
seeded motion vectors. Both captures were inspected. Reports and source/bundle
receipts live in `tests/native-features/evidence/uniform-native-modules`.
The iOS simulator has no motion sensors; physical iOS readings remain unproven.
The shared filename fixture supplies decomposed Unicode explicitly, preserving
APFS behavior and exact equality on both platforms. The Android runner installs
the candidate and verifies its APK hash before launch; the read-only snapshot
previously carried a different APK. Native source remains `3e4ba9152`.
No speed benchmarks were run.

RAN: final docs props/type drift, unavailable SSR contract, and strict native
coverage passed 126 tests. The One build and public fixture typecheck passed.
The coverage check used both retained reports; its inspected snapshot now
lists root namespaces and Android unavailable behavior without adding gaps.
Contrast caller migration: `fix/one-native-uniform-final`, refreshed from current
main; earlier validation was retained on `fix/one-native-uniform` (`61079f0e47`).
RAN: rebuilt and installed 17 One-family packages into the isolated Contrast
worktree with `bun release --into`; shell `tsc --noEmit` passed against those
artifacts. The refreshed branch waits for a published family containing the root
API before main can consume it. Assembled review is pending with m19584.
