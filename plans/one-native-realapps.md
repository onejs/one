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

[Final receipts](../tests/native-features/evidence/realapps/final/) contain API result values, exact source locations, package graph negatives/positives, native build output, routing receipts and captured preview hierarchies. [Earlier failures](../tests/native-features/evidence/realapps/diagnostic/negative-history.md) retain the original beta.168.1 matrix and complete failure excerpts. Temporary full build logs and install roots are named in [matrix.json](../tests/native-features/evidence/realapps/final/matrix.json).

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
