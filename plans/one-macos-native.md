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
- **JS engine:** the system JavaScriptCore through a JSI JSC adapter. It adds
  no engine bytes to the app. Hermes comes later: the prebuilt
  `hermesvm.xcframework` in RN 0.88 has no macOS slice (RAN: slices are ios,
  catalyst, simulator, tvos, xros), so Hermes on Mac means a source build.
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
- Inside `react-native` itself only, `macos` resolves to the `.ios.js` files,
  with a small owned override set (starting with `Platform` so `Platform.OS`
  is `'macos'`). The override set lives in `one-macos`.
- `One.platform` gains `'macos'`; `One.macOS` is the Mac component namespace.

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
  `isOn: boolean`, `revision: Int32`; event `onIsOnChange { isOn, revision }`,
  driven by the existing controlled protocol.
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
built packages. JS bundle baselines (iOS and Android release bundles of
`tests/native-features`, web build of `examples/one-basic`) are measured on
this branch's base commit `50d2bfbfdc` by the tooling worker before its first
change and recorded here.

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

M0 done: plan, package skeleton, npm baselines. M1 staffed.
