# one ios link set

Goal: cut the time One's iOS apps spend in dyld before `main`. Subject: `tests/rn-test-container` on the iOS 27.0 simulator (studio-64, iPhone 17 Pro, a shared host). Claim labels: RAN (measured here), INFERRED, GUESSED.

## status

- Done: the framework table, a cause for the pre-main cost, and the size of the saving a trimmed link set gives (probe app, RAN).
- Not done: a source prototype on `tm/one-ios-linkset`, and One cold launches current against prototype. The previous worker's warm build tree (`one-ios-js2`) no longer exists, so a One build was from scratch. `bun install` onto the Samsung disk alone took 25 minutes on the loaded host and `one prebuild` then sat 21 minutes without output (killed), so no One app was built. Nothing below is a One cold-launch number.
- Every number is the probe app unless it says otherwise.

## method: a probe instead of the One app

`probe/` holds a 15-line C app. It records milliseconds from process start (`p_starttime`) to `main` into a file, and `build.sh` links it with any list of `-framework` and `-l` flags and ad-hoc signs it. `measure.sh` installs several variants on one simulator and launches them interleaved (warm-up round first, then N rounds, terminate before each launch, wait until the `main` mark is written). One build takes seconds, so this bisects the link set far faster than rebuilding One. The sweeps ran outside a quiet window while a bun install was running on the same host, so read medians and ratios; the large steps are 1000 ms against a 5 to 40 ms spread.

Calibration (RAN): no extra frameworks 195 to 205 ms (n=5 to 7, many runs). One's 63 base frameworks (`probe/base-flags.txt`, from m55831's list) 1495 to 1605 ms. That matches m55831's rival experiment (1502 ms), so the probe reproduces the cost with no One code in it. One's full 122-image set (`probe/full-flags.txt`) gave 1429 to 1559 ms here against 2153 ms in m55831's rival run. I do not know why the full set is slower there (GUESSED: static initializers or Swift metadata in the rival's real code, or host load); the probe reports link-set cost only.

## cause (RAN)

The cost is not spread over 122 images. On the simulator dyld loads every image through `JustInTimeLoader` (prebuilt loaders are not used), so cost follows the transitive image count. One framework family pulls in about 660 extra images (1224 loaded against 564 for SwiftUI alone, 527 for nothing):

- Alone on top of UIKit and Foundation, **PassKit costs 1401 ms** (1247 images).
- Six frameworks that One imports each cost the same 1.4 to 1.5 s alone, and any single one of them added to the rest of the base set brings back the full cost (1517 to 1691 ms; removing all six gives 487 to 525 ms): AuthenticationServices, StoreKit, Charts, MessageUI, PhotosUI, SafariServices.
- Cross-import overlays and Swift libraries do the same: `_AuthenticationServices_SwiftUI`, `_StoreKit_SwiftUI`, `_PhotosUI_SwiftUI`, `_PassKit_SwiftUI`, `_MusicKit_SwiftUI`, `_QuickLook_SwiftUI`, `_RealityKit_SwiftUI`, `libswiftPassKit` and `libswiftARKit` each add 1.0 to 1.3 s alone (tables below). Every other overlay and libswift adds under 50 ms.
- INFERRED: they all reach one shared dependency (PassKit or something under it). I did not find the edge, so the trigger list is empirical; `probe/` can test any single framework in seconds.

Because each trigger is sufficient alone, removing some of them saves nothing. All of them must go from the default link set together. Full set minus only the six: 1590 ms (no gain, RAN n=7).

## what trimming buys (RAN, probe, n=7, interleaved)

| link set | frameworks and libs | median ms to main | min to max |
|---|---|---|---|
| none | UIKit, Foundation | 193 | 190 to 198 |
| current (122 images) | `probe/full-flags.txt` | 1454 | 1398 to 1521 |
| P: current minus every hub trigger | `probe/proposal-flags.txt` | 498 | 479 to 679 |
| P2: P minus nine mid-weight frameworks (ContactsUI, LinkPresentation, Social, WebKit, MapKit, VisionKit, Translation, EventKit, AVKit) | | 397 | 388 to 408 |

P removes 6 frameworks (AuthenticationServices, StoreKit, Charts, MessageUI, PhotosUI, SafariServices), PassKit, and the overlays and libs _AuthenticationServices_SwiftUI, _MusicKit_SwiftUI, _PassKit_SwiftUI, _PhotosUI_SwiftUI, _QuickLook_SwiftUI, _RealityKit_SwiftUI, _StoreKit_SwiftUI, libswiftARKit, libswiftPassKit. Saving about 950 ms in the probe, 65 percent of the pre-main time on the simulator. P2 shows a further 100 ms is available from mid-weight frameworks, each worth 10 to 40 ms alone.

## the table: every framework and Swift library One links

How to read it. `podspec`: `packages/one/One.podspec` declares no `frameworks`, `weak_frameworks` or `-framework` flag. Every framework below comes from compiling the pod's sources, because Swift `import X` and clang `@import` write autolink entries into the object files. Swift also records the modules that an imported module itself imports, and cross-import overlays (`_X_SwiftUI`) load when both SwiftUI and X are imported in one module. So a framework with "none in One sources" is requested by a transitive import or by another pod (React Native core, RNWorklets, SDWebImageWebPCoder, the app target), not by a One file. The generated modifier file `OneNativeStyle.swift` (10,621 lines, one SwiftUI modifier switch) imports 28 frameworks so that every SwiftUI modifier that takes one of their types is covered.

"Referenced symbol": I could not link an app, so `nm -u` and `otool -L` on a One binary were not run. INFERRED: a framework named in an import list of a compiled file is referenced by that file (the files use the types, for example `MusicKit.Song` in `OneNativeStyle.swift` and `PKPaymentButton` in the Apple Pay view). Confirming each against `nm -u` of a linked app is the first step once a build exists. Dead stripping cannot remove them: view classes are found by name (`componentProvider` in `package.json`, `NSClassFromString("OneSDKTable_*")`), so every referencing object stays live.

| framework | imported by (One pod sources) | feature | alone, ms to main (none = 195) |
|---|---|---|---|
| Accelerate | none in One sources | - | 207 |
| AudioToolbox | none in One sources | - | 210 |
| CoreGraphics | HybridOneSDK.swift, OneNativeEdgeFadeCurves.h, OneSDKRuntime.swift | SDK, edge fade | 209 |
| ImageIO | HybridOneImagePicker.swift, HybridOnePhotoLibrary.swift | image picker, photo library | 206 |
| MobileCoreServices | none in One sources | - | 204 |
| QuartzCore | OneNativeEdgeFadeBlurMaskLayer.h, OneNativeEdgeFadeMaskLayer.h | edge fade masks | 206 |
| UIKit | MenuActionView.swift, HybridOneAdaptive.swift, HybridOneAppleAuth.swift, HybridOneAudio.swift +52, 101 Generated | everything | - |
| JavaScriptCore | none in One sources | - | 211 |
| Foundation | OneNativeSourceEvents.swift, HybridOneAppIntents.swift, HybridOneAudio.swift, HybridOneBackgroundTasks.swift +26, 4 Generated | everything | - |
| AVFAudio | none in One sources | - | 209 |
| AVFoundation | HybridOneAudio.swift, HybridOneImagePicker.swift, HybridOnePhotoLibrary.swift, HybridOneSpeech.swift +3 | camera view, OneAudio, OneSpeech, OneImagePicker | 208 |
| AVKit | OneNativePictureInPicture.swift, OneNativeStyle.swift, 1 Generated | VideoPlayer, picture in picture | 246 |
| Accessibility | OneNativeStyle.swift | accessibility modifiers (generated) | 207 |
| AppIntents | OneNativeStyle.swift, 1 Generated | ShortcutsLink, accessibilityAction(intent:) modifiers, OneAppIntents | 231 |
| AppTrackingTransparency | none in One sources | - | 211 |
| AuthenticationServices | HybridOneAppleAuth.swift, HybridOneBrowser.swift, OneNativeStyle.swift, 1 Generated | Sign in with Apple button, OneAppleAuth, OneBrowser web auth sessions | **1469** |
| BackgroundTasks | HybridOneBackgroundTasks.swift | OneBackgroundTasks | 212 |
| CFNetwork | none in One sources | - | 209 |
| Charts | 1 Generated | Chart view | **1424** |
| CloudKit | none in One sources | - | 208 |
| Combine | HybridOneSDK.swift, OneNativeStyle.swift, OneSDKRuntime.swift | SDK runtime observation | 210 |
| Contacts | HybridOneContactUI.swift, HybridOneContacts.swift | OneContacts | 206 |
| ContactsUI | HybridOneContactUI.swift, HybridOneContacts.swift | OneContacts, OneContactUI | 390 |
| CoreFoundation | OneSDKRuntime.swift | SDK runtime | 206 |
| CoreImage | HybridOneImageManipulator.swift | OneImageManipulator | 206 |
| CoreLocation | HybridOneLocation.swift, HybridOneMapServices.swift, OneNativeStyle.swift | OneLocation, OneMapServices | 206 |
| CoreMedia | none in One sources | - | 207 |
| CoreMotion | HybridOneBarometer.swift, HybridOneMotion.swift, HybridOnePedometer.swift | OneMotion, OneBarometer, OnePedometer | 211 |
| CoreServices | none in One sources | - | 206 |
| CoreText | HybridOneFonts.swift | OneFonts | 205 |
| CoreTransferable | 1 Generated | Transferable view (generated) | 210 |
| CoreVideo | none in One sources | - | 205 |
| CryptoKit | HybridOneFileSystem.swift, OneUpdatesLauncher.swift | OneFileSystem hashing, OneUpdates | 205 |
| DataDetection | OneNativeStyle.swift | data detection modifiers (generated) | 210 |
| DeveloperToolsSupport | none in One sources | - | 204 |
| DeviceCheck | none in One sources | - | 212 |
| EventKit | none in One sources | - | 253 |
| LinkPresentation | none in One sources | - | 305 |
| LocalAuthentication | HybridOneProtectedStore.swift, HybridOneSecureStore.swift | OneSecureStore, OneProtectedStore | 214 |
| MapKit | HybridOneMapServices.swift, OneNativeStyle.swift, OneNativeUiMapView.swift, 6 Generated | Map views, OneMapServices | 268 |
| MediaPlayer | HybridOneAudio.swift | OneAudio now playing | 232 |
| MessageUI | HybridOneMailCompose.swift, HybridOneMessageCompose.swift | OneMailCompose, OneMessageCompose | **1414** |
| MusicKit | OneNativeStyle.swift | music selection modifiers (generated) | 222 |
| Network | none in One sources | - | 206 |
| PDFKit | none in One sources | - | 206 |
| Photos | HybridOnePhotoLibrary.swift, OneNativeStyle.swift, 1 Generated | OnePhotoLibrary, LivePhotoView | 240 |
| PhotosUI | HybridOneImagePicker.swift, OneNativeStyle.swift, 3 Generated | PhotosPicker, LivePhotoView, OneImagePicker | **1384** |
| RealityFoundation | none in One sources | - | 221 |
| SafariServices | HybridOneBrowser.swift | OneBrowser (SFSafariViewController) | **1379** |
| Security | HybridOneProtectedStore.swift, HybridOneSecureStore.swift | OneSecureStore | 208 |
| Social | OneShareComposeViewController.swift, OneShareTargetViewController.swift | share target extension view controllers | 282 |
| Speech | HybridOneSpeech.swift | OneSpeech | 234 |
| StoreKit | HybridOnePurchases.swift, OneNativeStyle.swift, 4 Generated | StoreView, ProductView, SubscriptionStoreView, OnePurchases | **1453** |
| SwiftData | OneNativeStyle.swift | modelContainer modifiers (generated) | 208 |
| SwiftUI | OneNativeAccessibility.swift, OneNativeAnimation.swift, OneNativeAnimators.swift, OneNativeArrangementView.swift +13, 105 Generated | every OneNative* SwiftUI view | 239 |
| Symbols | OneNativeStyle.swift | SF Symbols generated | 207 |
| Translation | OneNativeStyle.swift | translationPresentation modifier (generated modifiers) | 260 |
| UniformTypeIdentifiers | HybridOneFileSystem.swift, HybridOneImagePicker.swift, HybridOnePhotoLibrary.swift, OneNativeStyle.swift +1, 2 Generated | file system, pickers | 205 |
| UserNotifications | HybridOneNotifications.swift | OneNotifications | 204 |
| VisionKit | HybridOneDataScanner.swift, HybridOneDocumentCamera.swift | OneDataScanner, OneDocumentCamera | 262 |
| WebKit | OneNativeStyle.swift, 2 Generated | WebView | 281 |
| WidgetKit | OneNativeStyle.swift | widget modifiers (generated) | 236 |
| WorkoutKit | OneNativeStyle.swift | workoutPreview modifier (generated) | 211 |
| _AVKit_SwiftUI | none in One sources | - | 521 |
| _AppIntents_SwiftUI | none in One sources | - | 530 |
| _AuthenticationServices_SwiftUI | none in One sources | - | **1624** |
| _CoreLocationUI_SwiftUI | none in One sources | - | 529 |
| _DataDetection_SwiftUI | none in One sources | - | 518 |
| _GameController_SwiftUI | none in One sources | - | 510 |
| _LocationEssentials | none in One sources | - | 515 |
| _MapKit_SwiftUI | none in One sources | - | 518 |
| _MusicKit_SwiftUI | none in One sources | - | **1565** |
| _PassKit_SwiftUI | OneNativeStyle.swift | - | **1720** |
| _PhotosUI_SwiftUI | none in One sources | - | **1578** |
| _QuickLook_SwiftUI | none in One sources | - | **1495** |
| _RealityKit_SwiftUI | none in One sources | - | **1524** |
| _SecureElementCredential_SwiftUI | none in One sources | - | 515 |
| _StoreKit_SwiftUI | none in One sources | - | **1504** |
| _SwiftData_SwiftUI | none in One sources | - | 507 |
| _Translation_SwiftUI | none in One sources | - | 524 |
| _WebKit_SwiftUI | none in One sources | - | 514 |
| _WorkoutKit_SwiftUI | none in One sources | - | 535 |
| PassKit | OneNativeStyle.swift, OneNativeSwiftUI.swift, PayWithApplePayButtonView, AddPassToWalletButtonView | Apple Pay button, Add to Wallet button, Apple Pay modifiers | **1401** |

Swift libraries (all `-lswift*` entries come from autolinking; the 34 are the toolchain overlays for the modules above and their transitive imports; which module requests which one needs the object files, GUESSED from names: libswiftPassKit from PassKit, libswiftARKit from RealityKit):

| library | alone on top of the 6-trigger-free base (nosix 513), ms |
|---|---|
| libswiftARKit | **1813** |
| libswiftAVFoundation | 493 |
| libswiftAccelerate | 494 |
| libswiftCompression | 481 |
| libswiftCore | 480 |
| libswiftCoreAudio | 485 |
| libswiftCoreFoundation | 516 |
| libswiftCoreImage | 509 |
| libswiftCoreLocation | 514 |
| libswiftCoreMIDI | 495 |
| libswiftDarwin | 492 |
| libswiftDispatch | 502 |
| libswiftGLKit | 502 |
| libswiftIntents | 487 |
| libswiftMetal | 489 |
| libswiftModelIO | 501 |
| libswiftOSLog | 511 |
| libswiftObjectiveC | 509 |
| libswiftObservation | 491 |
| libswiftPassKit | **1549** |
| libswiftQuartzCore | 498 |
| libswiftSceneKit | 497 |
| libswiftSpatial | 492 |
| libswiftSpriteKit | 498 |
| libswiftSystem | 480 |
| libswiftUniformTypeIdentifiers | 493 |
| libswiftXPC | 483 |
| libswift_Builtin_float | 491 |
| libswift_Concurrency | 489 |
| libswift_DarwinFoundation1 | 515 |
| libswift_StringProcessing | 504 |
| libswiftos | 510 |
| libswiftsimd | 498 |
| libswiftCoreMedia | 508 |

## proposal: opt-in feature groups

Do not remove features and do not add runtime feature detection. The default link set becomes what P2 shows plus whatever the owner wants kept; each trigger group moves to a separately linked unit that an app adds when it uses the feature. All six triggers must leave the default together, or nothing is saved.

Groups and the files that import their framework today (all under `packages/one/ios`):

| group | frameworks it owns | files to move |
|---|---|---|
| Wallet | PassKit, libswiftPassKit, _PassKit_SwiftUI | Generated/OneNativePayWithApplePayButtonView.swift, Generated/OneNativeAddPassToWalletButtonView.swift (and their ComponentView .h/.mm), PassKit modifiers in OneNativeStyle.swift, Generated/OneNativeSwiftUI.swift |
| Store | StoreKit, _StoreKit_SwiftUI | Generated/OneNativeStoreViewView, ProductViewView, SubscriptionStoreViewView, Nitro/HybridOnePurchases.swift, StoreKit slots in Generated/OneNativeViewSlots.swift |
| Account | AuthenticationServices, SafariServices, _AuthenticationServices_SwiftUI | Nitro/HybridOneAppleAuth.swift, Nitro/HybridOneBrowser.swift, Generated/OneNativeSignInWithAppleButtonView |
| Messaging | MessageUI | Nitro/HybridOneMailCompose.swift, Nitro/HybridOneMessageCompose.swift |
| Photos | PhotosUI, _PhotosUI_SwiftUI | Nitro/HybridOneImagePicker.swift, Generated/OneNativePhotosPickerView, OneNativeLivePhotoViewView, PhotosUI modifiers in OneNativeStyle.swift |
| Charts | Charts | Generated/OneNativeChartView |
| Preview and 3D | QuickLook, RealityKit, MusicKit, ARKit libs, _QuickLook_SwiftUI, _RealityKit_SwiftUI, _MusicKit_SwiftUI | Generated/OneNativeQuickLookView and the QuickLook, RealityKit and MusicKit modifier cases in OneNativeStyle.swift |

How it fits the build, so the owner can judge the cost (INFERRED from reading `nitro.json`, `package.json` `codegenConfig` and the generated autolinking files; none of it was built):

1. Each group becomes a CocoaPods subspec (`One/Wallet` and so on) or a small pod, built from its own sources. A Nitro hybrid keeps working because `createHybridObject(name)` looks up by name; but `nitro.json` autolinking is per module, so Account and Messaging need their own `nitro.json` and nitrogen run. The Fabric views register through `componentProvider`, which is generated per package, so each group needs its own entry file too.
2. `OneNativeStyle.swift` is generated by `packages/one/codegen`. The generator must emit the modifier cases that take Wallet, Store, Photos, MusicKit, RealityKit and QuickLook types into the group's own file, and register them by name the way `OneSDKTable_*` already is (`NSClassFromString` lookup), so the core switch never references those types. This is the largest part of the work.
3. `vxrn` prebuild adds the groups an app uses (how it finds the used groups is undecided; GUESSED: from the app's JS imports), so an app that uses a feature still links it with no flag.
4. A JS call for an unlinked group fails with the existing `OneSDKError.unsupported` path, which `OneSDKRuntime.swift` already throws for unknown tables. That is an existing error, not new feature detection.

Decisions for the owner: (a) which groups are default-off, since a default-on group keeps its cost (any one of Store, Account, Messaging, Photos, Charts or Wallet restores about 1 s on the simulator); (b) whether the saving justifies the prebuild work, because on a device the system frameworks live in the dyld shared cache with prebuilt loaders and the 1 s is probably far smaller (GUESSED, never measured; the owner chose not to run a device). System framework initializers still run on a device, so a smaller set helps there too, by an unmeasured amount.

## results (branch tm/one-ios-linkset)

Built in `tests/rn-test-container`, Release for iOS simulator, against `origin/main` as the baseline (RAN).

- Release, no group used: `otool -L` drops from 242 to 200 lines. PassKit, StoreKit, AuthenticationServices, SafariServices, MessageUI, PhotosUI, Charts, QuickLook, RealityKit, MusicKit, ARKit and the `_X_SwiftUI` overlays and libswift libs are all gone.
- Debug: `RNTestContainer.debug.dylib` links every trigger.
- Release with `One.iOS.PayWithApplePayButton` on the first screen: link set is `["wallet"]`, only `_PassKit_SwiftUI` and `libswiftPassKit` of the triggers are linked, and the button renders (screenshot checked).
- Cold launches on one simulator, interleaved base, new, wallet, warm-up round then 10 each. Process start to first log line (about `main`) median: base 1844 ms (1759 to 2416), new 588 ms (566 to 649), wallet 1719 ms (1681 to 2140). Process start to the key window: base 1938, new 677, wallet 1817. The host was busy (load average about 10 to 15, quiet window never admitted), so absolute numbers are inflated; the interleaving keeps the comparison fair. No `app_delegate_init` mark was added; the log line and key window are the proxies. Routed content was not measured. A plain React Native control was not rebuilt, so the "within 100 ms of plain RN" bar is not shown: the earlier probe had 195 ms to `main` for plain RN and 498 ms for One with the triggers removed.
- A single group costs nearly the whole saving back (wallet 1719 versus new 588), as the sweep predicted: the first trigger framework pays the shared load.

## round two: detection, staleness, measurement (branch tm/one-ios-linkset)

### detection (RAN)

`src/vite/plugins/iosLinkSetPlugin.ts` is a rolldown plugin that One adds to the native plugin list (`globalThis.__vxrnAddNativePlugins`). It does nothing for dev or android and runs on the production ios bundle only. Its `transform` hook (order pre) hands every module of the bundler's own module graph to `src/cli/iosLinkSetAnalysis.ts`, except One's own sources, so third-party packages that use One count. The analysis parses each module with oxc and records:

- named imports from `one` and `one/*`, including `import { Purchases }` and `export { X } from 'one'`;
- member reads and destructuring on the `One` object and on `One.iOS`, through aliases (`const i = One.iOS`), `import * as`, `require('one')`, `await import('one')` and JSX member tags;
- string literals, property names and JSX attribute names equal to a group's modifier, slot or value key.

`ios-link-set.json` now carries those keys per group, and `bun run generate` derives them from the SwiftUI modifier table (`codegen/emitStyle.ts`) so they are not hand written. A computed read on a namespace (`One.iOS[name]`), or a namespace that escapes (passed as an argument, returned, spread, `export *`) keeps every group. A module that does not parse and names `one` keeps every group.

Production bundles of `tests/rn-test-container` (RAN): plain app gives `[]`; `<One.iOS.PayWithApplePayButton/>` gives `["wallet"]`; a node_modules package that calls `One.Browser.open` gives `["account"]`. Assumption from the owner: no eval, no `new Function`, no runtime built names.

Gaps: the module graph includes modules the bundler later drops, so an unused import of a group API counts (safe direction). A Metro bundle has no plugin, so `one prebuild` links every group with a warning there.

### staleness (RAN)

`one prebuild` runs the bundler with `ONE_IOS_LINK_SET_REPORT=<file>`; the plugin writes the groups there and `ios/one-link-set.json` is written from it. In an Xcode Release bundle phase the same plugin reads `PODS_ROOT` and `CONFIGURATION`, reads the groups the pod compiled from `Pods/Target Support Files/One/One.<configuration>.xcconfig`, and fails the bundle when the shipped bundle needs a group the binary lacks. Debug is skipped.

Failure shown with the test container (RAN). A Release app built with link set `[]`, then `<One.iOS.PayWithApplePayButton/>` added to the first screen and xcodebuild run again without prebuild: it exits 65 with

`[one] this Release build compiled out the wallet feature group that the app's JavaScript uses (compiled: none). The iOS link set is fixed when pods install. Run `one prebuild --platform ios` and build again.`

Running `one prebuild --platform ios` and building again succeeds (BUILD SUCCEEDED), writes `["wallet"]` and the binary links `_PassKit_SwiftUI` and `libswiftPassKit`.

Why not compute the set before the pod compiles in the same build: xcodebuild fixes the build settings (`SWIFT_ACTIVE_COMPILATION_CONDITIONS`) when it starts, from the pod install, so a script phase running earlier in the same build could only fail sooner, not change what the pod compiles. A pod `script_phase` with `execution_position: :before_compile` running the same analysis would fail the build before the pods compile, not after the app is compiled. That is a follow-up; it saves time on the failure path only.

### compiled-out slots and modifiers

A compiled-out view slot or modifier case now ends in `preconditionFailure("<name> needs the <group> feature group, which this build compiled out; run one prebuild --platform ios and rebuild")` instead of `unknown view slot` (generated from `codegen/emitStyle.ts`).

### measurement (RAN, 10 interleaved cold launches each after a warm-up round, one simulator)

Marks are `NSLog("startup_mark ...")` lines: `app_delegate_init` in `AppDelegate.init`, `routed_content` on `RCTContentDidAppearNotification` (the first routed screen for One, the first screen for plain RN). Times are milliseconds from process start (`sysctl` start time) to the log line. All four apps are Release for iOS simulator, same react-native 0.88.0. The plain RN control is m55831's `rn-rival` sources (`patches/rn-rival-sources.tgz`) with the startup trace calls replaced by the same two NSLog marks, built in `tests/rn-control` (not committed). The quiet window was not admitted in 50 minutes; load average was 6 before and 14 after the run, so read the ratios.

| app | app_delegate_init median (min to max) | routed_content median (min to max) |
|---|---|---|
| plain RN control | 253 (241 to 270) | 1716 (1650 to 1959) |
| One before (origin/main) | 1812 (1759 to 2123) | 2001 (1938 to 2351) |
| One after, no group | 608 (552 to 633) | 1853 (1740 to 1887) |
| One after, wallet group | 1689 (1545 to 1803) | 2171 (2011 to 2299) |

The acceptance bar (within about 100 ms of plain RN before `AppDelegate.init`) is not met: One with no group is 355 ms behind the control. The remaining difference is the frameworks One still links. `otool -L` shows 204 images for One against 74 for the control, including SwiftUI, AVKit, WebKit, MapKit, VisionKit, Translation, LinkPresentation, ContactsUI, EventKit, Photos, SwiftData, WorkoutKit and their overlays. The probe sweep above put the nine mid-weight frameworks at about 100 ms (P2), which does not cover 355 ms; the rest is SwiftUI and the libswift libraries. Nothing here is trimmed yet. One group still costs back nearly all of the gain (wallet 1689 against 608). Routed content is dominated by React Native and One startup, and shows One after no group 137 ms behind the control.

## round three: photos and speech split, and the floor (branch tm/one-ios-linkset-2)

`photos` now also owns `Photos` and the `OneImagePicker` and `OnePhotoLibrary` hybrids, and a new `speech` group owns `Speech` and `OneSpeech`. `OnePhotoLibrary` and `OneSpeech` are compiled only under their group, `OneNativeStyle.swift` imports `Photos` only under `ONE_GROUP_PHOTOS`, and `OneAutolinking` registers both by group. Modifiers declared only by a non-core overlay now carry `frameworks` (`codegen/deriveSDK.ts`) so `modifierGroups` can place them.

### measurement (RAN, 10 interleaved cold launches each, one simulator, load average about 37 because no quiet window was admitted)

| app | app_delegate_init median | routed_content median |
|---|---|---|
| plain RN control | 233 | 292 |
| One, no group (97 libs after the split, 99 before) | 586 | 668 |
| One, speech group | 592 | 676 |

The gap to plain RN at `AppDelegate.init` is about 353 ms against 355 ms before the split. Moving Photos and Speech out of the no-group binary changed the startup time by less than the run to run spread.

### what keeps the floor there

- The cost is a hub effect. Dyld load time follows the shared expensive dependency set, so removing a few frameworks saves nothing while any other always-compiled file still imports something that reaches it. All the heavy ones have to leave together.
- The remaining always-compiled importers are `OneNativeStyle.swift` and the `Hybrid*` files for Contacts and ContactsUI, MapKit, WebKit, VisionKit, AVKit, Translation, EventKit, LinkPresentation and GameController overlays.
- `OneSDKBindings` compiles per-framework `OneSDK_<Framework>.o` files (EventKit, PDFKit, DeviceCheck, CloudKit, LinkPresentation and others) that no group gates. Swift records each module's import closure in every object file, so these keep the frameworks linked.
- A cheap split of one or two frameworks does not reach the 300 ms target. Reaching it needs one bundled change: gate those hybrids, the `OneNativeStyle.swift` imports and the unconditional SDK binding files behind groups together, then re-measure.

## how it works

`ios-link-set.json` lists the groups. `one prebuild` writes `ios/one-link-set.json` from the production bundle (`src/cli/iosLinkSet.ts`). `One.podspec` defines `ONE_GROUP_X` conditions for those groups in Release and for all groups in Debug. Group sources, nitro registration and generated modifiers sit under those conditions. A compiled-out component keeps a stub class that renders nothing, and a compiled-out hybrid is not registered, so its call fails through the existing unsupported error. `OneStoreReview` moved to a Swift hybrid in the store group because its SDK import kept StoreKit linked in every app.

## known gaps

- The link set is captured at pod install. Adding a feature later needs `one prebuild`; a Release build that needs a missing group fails (see round two).
- A computed read or an escaping namespace keeps every group. A Metro bundle has no analysis plugin, so prebuild links every group there.
- The acceptance bar of 100 ms over plain RN is not met (about 353 ms at `app_delegate_init` after round three); see round three for what keeps the floor.
- Do not edit `codegen/sdk/app.ts` or other fingerprinted files; the fingerprint is embedded in the published bindings.

## files

`probe/main.m`, `probe/build.sh`, `probe/measure.sh` (needs a simulator UDID in `probe/sim.txt`), `probe/*-flags.txt`. Raw sweeps and the dyld image lists are in `/Volumes/Samsung-1TB-990/evidence/one-ios-link/probe/` (`sweep1` output, `item.txt`, `loo.txt`, `full.txt`, `libs-*.txt`).
