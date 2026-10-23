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

### 2. Packaging: Mac ships inside the default `one` install

Owner decision 2026-10-21 (quoted in the Contrast spec): include Mac by
default; it must not degrade people who do not use it, a few megabytes of
package growth is fine, and build times, bundle sizes and complexity stay
about the same. This replaces the separate optional package.

- Every Mac byte lives under one directory, `packages/one/macos/`:
  `macos/host/` (the AppKit host, today `packages/one-macos/macos/`),
  `macos/cpp/` (text layout, Mac component shadow nodes), `macos/template/`
  (the SwiftUI app template and build scripts) and `macos/react-native/` (the
  JS override set, today `packages/one-macos/src/react-native/`, shipped as
  plain JS outside `src` so `tamagui-build` and `dist` do not change). `one`'s
  `files` gains `"macos"`. The `one-macos` workspace package is deleted; apps
  depend on `one` only.
- Why one directory inside `one` rather than a sibling package: one version,
  one install, no dependency for Mac apps to add, and `macos/` sits outside
  every iOS and Android glob. `One.podspec` compiles `ios/**` and `cpp/**`
  only, so Mac sources must never go under `packages/one/ios` or
  `packages/one/cpp`. Android's CMake lists files by name. Autolinking reads
  only root podspecs, so any Mac podspec stays inside `macos/`.
- Mac native code is compiled only by the Mac app's own build
  (`macos/template/macos/scripts/build-core.sh`). Hermes, the
  `ReactNativeDependencies` macOS slice and any later prebuilt host
  xcframework (M6) download into the user cache on first Mac build; none of
  them ship in the npm package.
- `one` and `vxrn` JS stays behind `.macos.ts` files and the `macos` platform
  checks, so iOS, Android and web bundles never include it.
- Gates, recorded at M0 and rechecked at every milestone:
  - iOS and Android release JS bundles of `tests/native-features` and the web
    build of `examples/one-basic`: 0 bytes changed, compared as in the M1
    gate below, except shared constants that must name `macos` so other
    platforms skip Mac files. Each is listed here with its size: `'macos'` in
    the router's platform set (`getRoutes.ts`, 8 bytes, `2070373526`).
  - iOS and Android native: `One.podspec` source list and Android CMake
    sources unchanged (no file under `macos/` matched), `tests/native-features`
    iOS and Android release binary size unchanged, and their clean native build
    time within run-to-run noise.
  - Package: `npm pack --dry-run` of `one`, `vxrn` and `vite-plugin-metro`,
    deltas reported. `one` may grow a few MB (Mac sources are about 120 KB
    today); a prebuilt binary in the package needs the lead.
  - `bun install` of an iOS-only app pulls no new dependency.

The host worker moves `packages/one-macos/{macos,cpp,template,src}` to
`packages/one/macos/{host,cpp,template,react-native}` as one rename commit
after its in-flight M2 slice is committed and before the next one, updating
`project.yml`, the committed Xcode project, `build-core.sh`,
`utils/src/macosReactNativeResolve.ts` (resolve `one/package.json`),
`tests/macos-basic/package.json`, `bun.lock` and `one`'s `files`, then
rebuilds and relaunches `tests/macos-basic` once to prove the move.

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
  in `packages/one/macos/react-native`, where `Platform.OS` is `'macos'` and `select`
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
  so `packages/one/macos/template/` owns the Mac project (SwiftUI `App`, Podfile, Info.plist)
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
availability from the macOS symbol graph. Mac output goes to `packages/one/macos`.
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

Gate check at `8e2cc88e1c` (M1 head) against `50d2bfbfdc`, TESTED on
studio-64 with both sides fully built from source (`bun run build:js`) in fresh
worktrees:

| output | base bytes | head bytes | result |
| --- | --- | --- | --- |
| iOS release bundle | 10,921,767 | 10,921,767 | identical after normalizing worktree path, path-derived worklet hashes and bundler binding suffixes |
| Android release bundle | 7,128,691 | 7,128,691 | identical after the same normalization |
| `one-basic` web | 65 files | 65 files | only `version.json`, `buildInfo.json` and the entry chunk differ, each by the digit count of the build's random `CACHE_KEY` (8 digits on base, 7 on head); INFERRED cache key only, disproved by any diff left after replacing the key |

Builds must run `one`'s full build (`tamagui-build` then
`codegen/staticSpecs.ts`); `tamagui-build` alone leaves raw spec exports that
the codegen plugin rejects, and dists copied from another checkout can be stale.

## Work slices

One hands-on worker per surface. Neither edits the other's paths; contract
changes go through the planner.

**Tooling worker (Grok, medium): the `macos` platform in JS.**
`packages/utils/src/platformEnv.ts`, `packages/vxrn/src/**`,
`packages/vite-plugin-metro/src/**`, `packages/one/src/**` (including new
`*.macos.ts` files and `One.macOS`), `packages/one/macos/react-native/**` (the
`react-native` override set, starting with `Platform`), and the JS side of
`tests/macos-basic` (`app/`, `package.json`, `vite.config.ts`). Done when
`/index.bundle?platform=macos` serves a bundle that resolves `.macos` before
`.native`, `/hot?platform=macos` accepts a socket, `One.platform` is
`'macos'` in that bundle, and the iOS and Android bundles of
`tests/native-features` and the `one-basic` web build are byte identical to
baseline.

**Host worker (Sonnet, high): the native Mac host.**
`packages/one/macos/{host,cpp,template}/**` (until the move,
`packages/one-macos/{macos,cpp,template}/**`), and `tests/macos-basic/macos/**`. Done when
the M1 window loads the dev bundle from the tooling worker's server, mounts
`View`, `Text` and `OneMacToggle` with a working round trip, and survives an
HMR edit, with a screenshot pair as proof.

The planner owns this plan, review, and `packages/one/codegen/**` until M3
is staffed.

## Status

M0 done: plan, package skeleton, npm and bundle baselines. M1 done
(2026-10-21): the real `/index.bundle?platform=macos` from `one dev` mounts a One
route with `View`, `Text` and `One.macOS.Toggle` on Hermes, the toggle round
trips, and an HMR text edit applies with toggle state and pid kept. iOS and
Android bundles are unchanged at the M1 head (gate above). M2 is next.

Review of host commits `b3d70fb771`..`4d2805703d` (planner): accepted. Owed
before M3: the toggle's controlled logic in `OneMacosToggleComponentView.mm`
duplicates `ios/OneNativeControlled.swift`; the generated Mac glue must share
one native implementation of it. Keep one of `project.yml` and the committed
`MacosBasic.xcodeproj`, not both, once `prebuild` emits the Mac project.

M2 in progress. Review of host commits `7622915b0d`..`ae87bb7f25` (planner):
accepted with fixes owed. The move to `packages/one/macos/` landed as one
rename commit and dropped the committed `MacosBasic.xcodeproj`, which settles
the `project.yml` item above. Pointer, hover, cursor, focus, Tab order, Space
press and accessibility roles are in (`OneMacosPointerHandler`); hover runs on
W3C pointer events through the `shouldPressibilityUseW3CPointerEventsForHover`
flag. ScrollView is on `NSScrollView`, Image on an owned `ImageManager`. Owed
in ScrollView: the Fabric state offset updates only on live scroll end, so a
discrete mouse wheel and `scrollTo` leave it stale (wrong `measure` inside the
list), and an initial `contentOffset` prop is ignored on mount. M2 still owes
TextInput, dark mode and window resize updating dimensions.

Review of `b0761a2676`..`235d8d47a2` (planner): ScrollView state fix and dark
mode accepted. TextInput is on a bare `NSTextView` and owes caret scrolling for
long single-line text, overflow scrolling for multiline, `secureTextEntry`
(single line on `NSTextField` and `NSSecureTextField`, multiline in an
`NSScrollView`), and no `onKeyPress` for command shortcuts.

First consumer, Team Machine's gui (s64797), batch 1 decisions: `.macos`
routes fixed (`2070373526`); no per-app extension order, a `.macos` file
overrides an iOS-shaped `.native` one; no host `globalThis.expo` shim yet,
apps alias expo packages per platform until absorbed packages cover Mac in M4;
Hermes and deps caches keyed on the RN version and public JS log lines go to
the host worker; a missing Mac variant failing the bundle with the package name
goes to `one-macos-bare-import` (Sol). The RN version bump of the consumer is
s63941's call.

Review of `ab09a46ec2`, `5b6024620b`, `86324f60ce` (planner): accepted. The
Mac toggle now runs on the shared `ios/OneNativeControlled.swift`, which settles
the duplicated controlled logic owed before M3; `prebuild`'s Mac project must
list that file too. Deps and Hermes caches are stamped with the RN version. A
Mac import with no `.macos`, `.native` or plain file now fails the bundle with
the package name (the runtime-throwing stubs are gone, and rolldown's
`UNRESOLVED_IMPORT` is an error on macos), and static expo imports resolve
normally on macos instead of going external.

### Planner handoff (macos-lead-2, 2026-10-21)

Staffing change: the lane drops to one Sonnet, owned by s63941. State at
handoff:

- Packaging: Mac ships in the default `one` install under `packages/one/macos/`
  (section 2); the move landed in `7622915b0d`. The owner quote is on Contrast
  main in `specs/one-macos-native.md` (`c705b0a77f`, landed).
- Reviewed and accepted: every host commit through `ab09a46ec2` and
  `5b6024620b`, and the bare-import fix `86324f60ce`. Router `.macos` fix
  `2070373526` (planner).
- M2 open: the TextInput rewrite (NSTextField and NSSecureTextField for single
  line, NSScrollView with NSTextView for multiline, no `onKeyPress` for command
  keys) and public-format JS log lines sit uncommitted in the shared tree
  (`OneMacosTextInputComponentView.mm`, `OneMacosModules.mm`,
  `OneMacosRootView.mm`, `tests/macos-basic/app/index.tsx`), owned by
  one-macos-host-m2, unreviewed. After them M2 closes on a review of those
  commits.
- Owed checks: no iOS, Android or web byte comparison was run after `7622915b0d`;
  rerun the M1 gate before M3. Known deltas are listed in section 2.
- Open consumer asks (s64797): the consumer's RN 0.88 bump is s63941's call;
  expo coverage on Mac waits for absorbed packages in M4.
- Owed before M3: `prebuild` emits the Mac project, including
  `ios/OneNativeControlled.swift`.

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

### Native host continuation (2026-10-23)

The original experiment through `efb7ce9cc9` was merged into fresh main on
`tm/macos-resume` without conflicts. The native fixture builds against the
locked RN 0.88 dependencies and the existing cached Hermes/dependencies archives.

The previous NativeAnimated completion callback hid a native rendering defect.
With React's render counter unchanged during the two-second fixture animation,
the baseline native view stayed at opacity 0.2 and translateX 0 halfway through;
opacity changed only when the completion callback rerendered React. The repaired
scheduler forwards synchronous prop updates to the mounting manager, which clones
props with the mounted component's Fabric descriptor. The base native view now
applies resolved transforms on prop and layout updates. Native samples progress
through opacity 0.2624 and 0.5255 and translateX 9.36 and 48.82, ending at 1 and
120. The shadow-tree notification stays empty: upstream UIManager performs that
commit itself, and upstream iOS also leaves the notification empty.

The debug command harness no longer activates the app or makes its window key.
It can inspect native opacity, translation, text editors and scroll offsets, and
exercise native commands and presses in an owned background instance. The fixture
includes animation unmount/remount and host reload controls. Runtime captures and
native readbacks verify single-line submit, controlled uppercase with maxLength,
multiline editing, initial scroll offset, scrollTo, wheel scrolling and resized
window dimensions. Active-animation unmount/remount retains working animation.

Reload exposed a separate lifetime bug: queued JS rendering commands capture the
scheduler delegate directly, but host teardown destroyed it before draining the
JS queue. Teardown now retains the delegate until the old JS thread exits.
A second reload exposed the display link calling the destroyed animation manager:
RN requests an asynchronous stop from its manager destructor. The host now clears
the callback synchronously, serialized with frame execution, before scheduling
AppKit display-link cleanup on the main thread. The final build survives three
consecutive reloads during active animations; every fresh runtime produces
intermediate native opacity/translation and the last reaches opacity 1 and
translateX 120.

These changes are confined to the macOS host and fixture. No fresh iOS/Android/web
byte comparison was run for this continuation; the earlier comparison is
historical evidence. Reanimated and a native split-view container remain outside
this result; the existing macOS split-view adapter renders its slot only.

Native accessibility activation also exposed an inactive-window defect. The
fixture's focusable Pressable returned success from accessibilityPerformPress
but never changed state, while a direct host press did. NSApp's untargeted
sendAction searched the active window rather than the background target's
responder chain. Presses now start at the target view with tryToPerform and
return its actual result. Both fixture buttons increment through the native
accessibility method before reload, and the first increments again after reload.
A non-button rejects the action. Every sampled action reports appActive false
and windowKey false. These checks invoke the native accessibility method in the
owned host; downstream ControlRoom accessibility acceptance remains with the
consumer. The incremental native build passes.

### AppKit controls continuation, 2026-10-22

`One.macOS.Button` and `One.macOS.SegmentedControl` now use real `NSButton`
and `NSSegmentedControl` children through the existing Fabric registration.
Button supports title, SF Symbol, disabled state and a press callback. Segmented
selection uses the same Swift `OneNativeControlled` and JS `useControlled`
acknowledgement/revision protocol as Toggle. The public API, app-target setup
and manual fixture recipe live in `packages/one/macos/README.md` and
`tests/macos-basic/probe/CONTROLS.md`.

The initial fixture exposed a collision between the generic direct `press`
event and React Native's bubbling event registry. Specific native events
`buttonPress` and `selectedIndexChange` fix it while preserving public
`onPress` and `onChange` callbacks. A separate native target builds against the
merged HTTP/Blob host base. Runtime checks exercise native AX press/select,
React selection updates, selection rejection, disabled actions, retained state
across unmount/remount, and fresh callbacks after host reload. Native AX reads
confirm disabled controls; an attempted disabled segment AXPress returns
success from AppKit but changes neither the native selection nor React state.
The app remains inactive, the window non-key, and the hardware cursor unchanged.

Evidence is retained outside source with loaded bundle, app and archive hashes.
CuaDriver supplies the real interprocess AX actions and state; its window bitmap
capture timed out, so screenshots use the existing app-owned bitmap capture.
These checks cover the fixture. Consumer wiring and independent review remain
with the integration lead. No fresh iOS/Android/web byte comparison or stable
release was performed for this unit.
