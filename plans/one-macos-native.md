# One on native macOS

Experiment lane. Owner: macos driver session s63941. Planner and reviewer: this
plan's author. Branch: `tm/one-macos`.

## Direction

The owner's 2026-10-21 direction is recorded in the private Contrast spec
`specs/one-macos-native.md`: a fully native macOS target that can build
anything Xcode can, following One V2 patterns, supporting platform
extensions, adding no released-binary or install bloat to other platforms,
and learning from react-native-macos without depending on it. It supersedes
the Catalyst and react-native-macos recommendation in the earlier
`one-v2-macos-support.md` draft.

## Decisions

### 1. Host runtime: an owned AppKit host on unforked React Native C++

The Mac app runs the app's own installed `react-native` (0.88 today) with no
fork and no version lag. We compile only RN's platform-neutral C++ core for
macOS and write the AppKit layer ourselves.

- **Compiled from the installed `react-native`:** `jsi`, `react/renderer`
  (core, components/view, text, root, scrollview later), scheduler, runtime
  scheduler, Yoga, the bridgeless `react/runtime` instance, and the C++
  TurboModule core. Use the existing `platform/cxx` variants of `graphics` and
  `components/view`.
- **Authored by us:** `textlayoutmanager/platform/macos` (TextKit with NSFont
  and NSColor, ported from the iOS one), the mounting layer (surface root
  NSView, main-thread mutation applier, component view registry, base
  `NSView` component view for frame, color, border, opacity, clipping), event
  dispatch from NSEvent into Fabric event emitters, and a minimal set of
  TurboModules that RN's JS needs to boot (platform constants reporting
  `macos`, device info and window dimensions, appearance, app state, source
  code, dev settings, WebSocket for HMR, logging).
- **JS engine:** Hermes, built from source for macOS. The prebuilt
  `hermesvm.xcframework` in RN 0.88 has no macOS slice (RAN: slices are ios,
  catalyst, simulator, tvos, xros). M1 first booted on system JavaScriptCore,
  but react-native-worklets 0.13 creates every worklet runtime with
  `makeHermesRuntime` and has no JSC path (RAN: `WorkletRuntime.cpp`), and
  `useNativeState` and the `swiftStyle` sync store depend on worklets. One
  engine for both runtimes; the JSC adapter is removed once Hermes boots.
- **Nitro and worklets:** Nitro's core and worklets' core are built for macOS
  with no One hybrid objects registered; One already creates hybrids lazily
  and its fetch steps aside when `OneFetch` is absent. Reanimated stays out of
  the Mac bundle (the stack's shared transition boundary has a `.macos`
  variant).
- **Third-party native dependencies:** `ReactNativeDependencies.xcframework`
  (folly, glog, fmt, boost) already ships a `macos-arm64_x86_64` slice (RAN).
  `React.xcframework` (React-Core-prebuilt) does not (RAN), which is why the
  core is compiled from source.
- **App shell:** the generated app is a SwiftUI `App` whose `WindowGroup`
  hosts the RN surface through `NSViewRepresentable`. Menus (`.commands`),
  Settings, extra windows, `MenuBarExtra` and toolbars stay ordinary SwiftUI
  and AppKit, so anything buildable in Xcode stays buildable.
- **SwiftUI controls:** a Fabric component view hosts `NSHostingView`, the Mac
  counterpart of `OneNativeHostingController`. The controlled protocol in
  `src/platform/controlled.ts` is reused unchanged.

Learn from react-native-macos without depending on it: its `RCTUIKit` view
shim, key and focus handling, field-editor TextInput, pasteboard and
accessibility are the reference for M2.

Rejected: react-native-macos (latest 0.83.0 against our 0.88, a full RN fork
to track), Mac Catalyst (UIKit on Mac, does not feel native), GPUI (not an
NSView hierarchy, controls cannot clip or layer under GPUI content).

Falsifier: if a ReactCommon unit we need does not compile for macOS without
editing RN source, record the unit and the patch. One or two small patches
applied by our build are acceptable; a patch series that grows with each RN
release reopens the fork question.

### 2. Packaging: Mac lives in its own optional package

- New npm package `packages/one-macos` (`@one/macos` name to confirm) holds
  every Mac native byte: host runtime, text layout, mounting, TurboModules,
  generated Mac controls, the podspecs and the app template. Only Mac apps
  install it.
- `One.podspec` stays iOS-only and `packages/one/ios/Generated` stays byte
  identical. Android is untouched.
- `one` and `vxrn` gain only JS: the `macos` platform name, resolution rules,
  and `One.macOS` component specs in `.macos.ts` files, so iOS, Android and web
  bundles never include them.
- Measured gates, recorded at M0 and rechecked at every milestone:
  `npm pack --dry-run` size of `one`, `vxrn` and `vite-plugin-metro`; the iOS
  and Android release JS bundle of `tests/native-features`; the web build of
  `examples/one-basic`. Native iOS and Android deltas must be 0 bytes; JS
  bundle deltas must be 0 bytes; package deltas are reported, target under
  20 KB unpacked for `one`.

### 3. JS platform `macos` in vxrn and One

- `macos` is a third native platform beside `ios` and `android`: its own Vite
  native environment, dev bundle at `/index.bundle?platform=macos`, and HMR
  over the same rolldown `dev()` runtime and `/hot?platform=` socket. That
  client needs the host's `WebSocketModule`, `SourceCode` and `DevSettings`
  TurboModules; RN's own `HMRClient` stays stubbed as on iOS.
- The platform set is a closed `'ios' | 'android'` union in about 40 places
  (`utils/src/platformEnv.ts`, `vxrn/src/constants.ts`,
  `vxrn/src/plugins/reactNativeDevServer.ts` `validPlatforms`,
  `vxrn/src/utils/createNativeDevEngine.ts`, `one/src/one.ts`
  `currentPlatform()` which today reports `'web'` for anything else,
  `one/src/vite/one.ts` environments). Widen each to a shared
  `NativePlatform` type; do not add a third ternary branch where an
  `ios`/`android` ternary already exists, since several treat "not ios" as
  android.
- The Mac release bundle is plain JS for M1 (the Hermes bytecode step in
  `reactNativeDevServer.ts` stays iOS only until M6).
- App and library resolution order: `.macos.*`, `.native.*`, then the plain
  file. No `.ios.*` fallback for app code or third-party packages: a Mac is
  not an iPhone, and silent iOS fallback is how UIKit-only JS sneaks in.
- Inside `react-native` itself only, `macos` resolves to the `.ios.js` files
  and RN's own modules keep `Platform.OS === 'ios'`: the host implements the
  iOS-shaped native module contract, and RN's JS has about 40
  `Platform.OS === 'ios'` branches (Alert, Settings, `ViewConfigIgnore`,
  lists) that would otherwise take Android paths (RAN: grep of RN 0.88
  `Libraries`). Every importer outside `react-native` gets the owned override
  in `packages/one-macos/src`, where `Platform.OS` is `'macos'` and `select`
  reads `macos`, `native`, then `default`. The resolver picks the Platform
  module by importer path.
- `One.platform` gains `'macos'`; `One.macOS` is the Mac component namespace.
- Built packages import siblings by full name (`./one.native.js`), so vxrn's
  `macosDistVariantPlugin` swaps in an emitted `X.macos.native.js` when one
  exists. That is how `.macos` platform files work inside prebuilt packages.

Falsifier: if RN 0.88's iOS JS calls a native module our host cannot
reasonably supply, add it to the override set and record it here.

### 4. Platform extensions and app extensions

- File platform extensions: `.macos.tsx` routes and components work like
  `.ios.tsx` today, including in the file router.
- Project generation: iOS copies the RN community template and patches it in
  `vxrn/src/exports/prebuildWithoutExpo.ts`. That template has no `macos/`,
  so `one-macos` owns `template/macos/` (SwiftUI `App`, Podfile, Info.plist)
  and `prebuild` dispatches `macos` to it.
- App extensions: macOS widgets reuse `generateIosWidgets` and
  `patchIosPbxprojWidgets` with a macOS SDK, deployment target and output
  project, and App Intents reuse `generateIosAppIntents`. Share, Quick Look and
  Finder Sync extensions have no generator on any platform yet; they are new
  shared work in M5, written once for both iOS and macOS.

### 5. Generator parameterized by SDK

`packages/one/codegen` takes a platform descriptor (SDK `macosx` or
`iphonesimulator`, target triple, minimum version, availability key,
view base `NSView` or `UIView`, output directory). The SwiftUI view files are
mostly shared; the Fabric glue is per platform. Catalog entries gain Mac
availability from the macOS symbol graph. Mac output goes to `one-macos`.
Falsifier for "no iOS change": regenerating iOS yields zero diff.

## Milestones

**M0, setup (planner).** This plan, size baselines, `packages/one-macos`
skeleton, helper slices. Done when baselines are recorded below.

**M1, a real window.** `one dev` plus the Mac app opens a native macOS window
that mounts `app/index.tsx` from `tests/macos-basic`, rendering `View`, `Text`
and one SwiftUI control (`One.macOS.Toggle` via `NSHostingView`) whose value
round-trips to React state. Editing the route's text updates the window
within 2 s without a relaunch and keeps the toggle state (Fast Refresh).
Proof: screenshot before and after the edit, plus the size gates showing 0
bytes added to iOS, Android and web.

**M2, interaction.** Pressable with mouse and hover, `ScrollView` on
`NSScrollView`, `TextInput` on the field editor, keyboard focus and tab
order, cursor, accessibility labels, dark mode, window resize updating
dimensions.

**M3, One Native on Mac.** SDK-parameterized generation, first ten Mac
controls, `swiftStyle`, and SwiftUI to RN to SwiftUI composition that clips
correctly inside a scroll view.

**M4, app shell and routing.** One `Stack` and `Tabs` on Mac,
`NavigationSplitView` sidebar, menus and commands, toolbar, multiple windows,
Settings scene, `MenuBarExtra`.

**M5, services and extensions.** Nitro modules on macOS for shared services
(Nitro's podspec already declares macOS), one widget and one share extension
generated from the shared extension path.

**M6, release.** Hermes for macOS, prebuilt host xcframework per RN version
to cut build time, signing and notarization, a canary.

## M1 interface contract

Both helpers build against this; change it only through the planner.

- Dev bundle: `http://localhost:<port>/index.bundle?platform=macos&dev=true`,
  port from the app's `Info.plist` key `OneDevServerURL`, default 8081.
- Registered module name: `main` (same as iOS).
- First control: Fabric component `OneMacToggle`, props `label: string`,
  `isOn: boolean`, `revision: Int32`, `acknowledgedEvent: Int32`; event
  `onIsOnChange { isOn, eventCount, revision }` (`topIsOnChange`), driven by
  the existing controlled protocol in `src/platform/controlled.ts`.
- `PlatformConstants` reports `osVersion`, `interfaceIdiom: 'mac'`,
  `isTesting`, and `reactNativeVersion` of the installed RN.

## Size baselines

Published 2.9.1 on npm (RAN `npm view`), unpacked bytes and files:

| package | unpacked | files |
| --- | --- | --- |
| `one` | 130,742,327 | 12,233 |
| `vxrn` | 3,991,387 | 618 |
| `@vxrn/vite-plugin-metro` | 2,059,124 | 329 |

Compare against a canary of this branch with `npm pack --dry-run` on the
built packages.

JS bundle baselines, TESTED by the tooling worker on studio-64 with
`one`, `vxrn`, `utils` and `vite-plugin-metro` sources identical to
`50d2bfbfdc`:

| output | bytes | sha256 |
| --- | --- | --- |
| `tests/native-features` iOS release `ios.js` | 10,908,831 | `adf026f9a21e0547eedc3922170a66cdd819a973f638d95187cb7cce7ac113d1` |
| `tests/native-features` Android release `android.js` | 7,115,711 | `a7c221a53bdb05b579bd90867dc9d81bff0a5e8200e24f6ed8f5f8695691d571` |
| `examples/one-basic` web dist (sha256 of sorted per-file list) | 2,856,099 | `707a2e932f5dd0a09fe6671ee291881efc94fc9e8b0f35bce61c46b21614ee53` |

Gate check at `1b9ecc2922` against `50d2bfbfdc`, TESTED on studio-64 with
both sides fully built from source (`bun run build:js`) in fresh worktrees:

| output | base bytes | head bytes | result |
| --- | --- | --- | --- |
| iOS release bundle | 10,921,767 | 10,921,767 | same code; differs only in worktree path, path-derived worklet hashes and one bundler binding suffix (`import_react_native$385` vs `$386`) |
| Android release bundle | 7,128,691 | 7,128,691 | identical after normalizing worktree path and worklet hashes |
| `one-basic` web | 65 files, 2,856,134 | 65 files, 2,856,134 | per-file sizes identical |

Builds must run `one`'s full build (`tamagui-build` then
`codegen/staticSpecs.ts`); `tamagui-build` alone leaves raw spec exports that
the codegen plugin rejects, and dists copied from another checkout can be stale.

## Work slices

One hands-on worker per surface. Neither edits the other's paths; contract
changes go through the planner.

**Tooling worker (Grok, medium): the `macos` platform in JS.**
`packages/utils/src/platformEnv.ts`, `packages/vxrn/src/**`,
`packages/vite-plugin-metro/src/**`, `packages/one/src/**` (including new
`*.macos.ts` files and `One.macOS`), `packages/one-macos/src/**` (the
`react-native` override set, starting with `Platform`), and the JS side of
`tests/macos-basic` (`app/`, `package.json`, `vite.config.ts`). Done when
`/index.bundle?platform=macos` serves a bundle that resolves `.macos` before
`.native`, `/hot?platform=macos` accepts a socket, `One.platform` is
`'macos'` in that bundle, and the iOS and Android bundles of
`tests/native-features` and the `one-basic` web build are byte identical to
baseline.

**Host worker (Sonnet, high): the native Mac host.**
`packages/one-macos/{cpp,macos,template}/**`, `packages/one-macos/*.podspec`,
`packages/one-macos/package.json`, and `tests/macos-basic/macos/**`. Done when
the M1 window loads the dev bundle from the tooling worker's server, mounts
`View`, `Text` and `OneMacToggle` with a working round trip, and survives an
HMR edit, with a screenshot pair as proof.

The planner owns this plan, review, and `packages/one/codegen/**` until M3
is staffed.

## Status

M0 done: plan, package skeleton, npm and bundle baselines. M1 native side
proven against a stand-in bundle; M1 is met only when the real
`/index.bundle?platform=macos` mounts and survives an HMR edit.

Review of host commits `b3d70fb771`..`4d2805703d` (planner): accepted. Owed
before M3: the toggle's controlled logic in `OneMacosToggleComponentView.mm`
duplicates `ios/OneNativeControlled.swift`; the generated Mac glue must share
one native implementation of it. Keep one of `project.yml` and the committed
`MacosBasic.xcodeproj`, not both, once `prebuild` emits the Mac project.

### M1 host result (host worker)

Falsifier outcome: no RN source patches were needed. `OneMacosCore` compiles the
installed react-native 0.88 `ReactCommon` plus four iOS pod files that are plain
Foundation code (`PlatformRunLoopObserver.mm`, `AppleEventBeat.cpp`,
`FollyConvert.mm`, `LowPriorityExecutor.mm`). Excluded for M1: the `nativemodule/*`
dirs (cputime, defaults, featureflags, idlecallbacks, intersectionobserver,
microtasks, mutationobserver, resizeobserver, viewtransition, webperformance) and
`renderer/animated*`, which need generated `FBReactNativeSpec` headers; JS falls
back. `legacyviewmanagerinterop` is included because the component registry links
against it. Only the deps `Headers` root may be on the include path (a
`Headers/folly` entry shadows libc `math.h`).

`ReactNativeDependencies.framework` in the macOS tarball has its symlinks
flattened, which codesign rejects, so `embed-deps.sh` rebuilds the versioned
layout before signing.

Proof, run against a hand written stand-in bundle (the tooling worker's server
had not landed): window mounts `RCTView`, `RCTText` and `OneMacToggle`; a click
on the SwiftUI switch round trips to JS state and back (text reads `on`); an HMR
push over the real `WebSocketModule` changes the title text with the toggle kept
on and no relaunch. Debug builds accept `ONE_MACOS_DEBUG_DIR` (SIGUSR1 writes a
window png, SIGUSR2 clicks the toggle) for hosts without screen capture grants.
Launch with `-ApplePersistenceIgnoreState YES` if a previous run was killed, or
SwiftUI restores no window.

Real bundle (`tests/macos-basic/app/index.tsx` through `one dev`):

TurboModules RN's JS requested at boot, in order: NativePerformanceCxx,
NativeMicrotasksCxx, SettingsManager, ReactDevToolsRuntimeSettingsModule,
NativeReactNativeFeatureFlagsCxx, PlatformConstants, DevSettings, Networking,
DevLoadingView, SourceCode, LogBox, BlobModule, WebSocketModule, NitroModules,
DeviceInfo, WorkletsModule, I18nManager, Appearance, OneNativeSafeAreaContext.
All are hand written C++ TurboModules in `macos/OneMacosModules.mm`; unknown names
return nullptr. The feature flags module answers undefined for every accessor so
the JS getters keep their defaults.

Nitro-on-mac pulled forward from M5: `OneMacosCore` compiles
react-native-nitro-modules' `cpp/` and the host's `NitroModules` TurboModule calls
`margelo::nitro::install`. No One hybrid objects are registered, so anything that
calls `createHybridObject` for a One service throws.

Hermes decision: the main runtime and worklet runtimes run on Hermes through RN's
`HermesInstance`; the JSC adapter is deleted. Hermes is the Maven prebuilt
`hermes-ios-260318099.0.4` macosx slice (`hermesvm.framework`), cached in
`~/Library/Caches/ReactNative`, so no source build was needed. Prebuilt pull,
build and integration took 2m29s. Debug `MacosBasic.debug.dylib` grew from
27,732,192 B to 27,872,080 B (+139,888 B); `hermesvm.framework` adds a 14,884,496 B
universal debug binary; JavaScriptCore is no longer linked.

Worklets: react-native-worklets 0.13 core (`Common/cpp/worklets`) is compiled into
`OneMacosCore` with its Foundation networking backend and logger; the host's own
`WorkletsModule` TurboModule installs the proxy (a CADisplayLink serves
`requestAnimationFrame`). Reanimated stays out of the mac bundle through `.macos`
variants (bundle 9.18 MB to 7.66 MB).

Resolved blocker: the OneAdaptive import chain was fixed on the JS side
(`adaptive/index.macos`, `Image.macos`); the host registers no One hybrid.

op-sqlite 15 core (`cpp/*.cpp`) builds on the system sqlite
(`OP_SQLITE_USE_PHONE_VERSION=1`, `-lsqlite3`, no sqlcipher, libsql or turso). The
host's `OPSQLite` TurboModule returns Application Support and Library paths and
calls `opsqlite::install`. Rule for later libraries: a podspec that declares
`:osx` with a portable C++ core is built for Mac; UIKit-only code stops at the lead.

More boot modules: `LinkingManager` (NSWorkspace for open and settings),
`ImageLoader` (rejects every call; images go through RN's own `Image`),
`SoundManager`, `FrameRateLogger` and `KeyboardObserver` (no-ops). `NativeDOMCxx` is
now the real `NativeDOM` from `react/nativemodule/dom`; the header only needs the
`FBReactNativeSpec` include root, so the earlier "needs generated spec headers"
exclusion applied to `dom` alone no longer holds. Without it the root `Document`
fails with `Cannot read property 'linkRootNode' of null`.

Hermes has no `console`, and the bundle only stubs one, so the host installs a
console that feeds `nativeLoggingHook` before the bundle runs. JS logs and
exceptions now show up in the app log as `[one-macos] js log(level)`.

Proof against the real bundle: the `index.tsx` route mounts View, Text and
`One.macOS.Toggle` (label `macOS`, probe `macos-file`, `Enabled` switch, `off`).
A click on the switch round trips to JS (`on`). Editing the route text through
`one dev` HMR changes it to `macOS hot reloaded` in the same process with the
toggle still on and no relaunch.
