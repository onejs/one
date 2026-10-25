# one ios startup

Goal: cut One's iOS JavaScript startup. Subject is the Release app `tests/rn-test-container` on an iOS 27 simulator (studio-64, shared host, so numbers are noisy), RN 0.88 bridgeless, Hermes bytecode.

Claim labels: RAN (measured here), INFERRED, GUESSED.

## where the 37 ms of bundle evaluation goes

RAN: per-module init timers (rolldown `__esmMin`/`__commonJSMin` wrappers) over 10 instrumented cold launches. 639 module inits, 25.6 ms median wall with the timers on.

| ms (median) | module | what it is |
| --- | --- | --- |
| 11.75 | `NativePlatformConstantsIOS` | first `TurboModuleRegistry.getEnforcing('PlatformConstants')` |
| 1.74 | `NativeDeviceInfo` | `DeviceInfo` module |
| 1.64 | `src$5` | worklets |
| 1.19 | `NativeWorklets` | worklets native module |
| 0.77 | `BridgelessUIManager` | |

The remaining ~10 ms is spread over hundreds of inits, none above 0.5 ms. No single JS module there is worth the 3 ms bar.

Cause of the 11.75 ms and 1.74 ms: `PlatformConstants`, `DeviceInfo`, `AccessibilityManager`, `Appearance` and `OneNativeSafeAreaContext` set `requiresMainQueueSetup = YES`. On first JS access the JS thread does a synchronous hop to the main queue. The main thread is still inside `startReactNative` and the app's launch work (about 8.5 ms after `start_react_native_returned`), so the JS thread sits blocked. RAN: `mod_begin_PlatformConstants` 1843.7, served at 1858.1 in the base trace.

## fix

React Native's own mechanism is `unstableModulesRequiringMainQueueSetup`. `RCTInstance` creates the listed modules on the main queue before the bundle evaluates, and the main thread does that work in parallel with nothing waiting on it. The list comes from `delegate.dependencyProvider`, so the One iOS template now sets a small `RCTAppDependencyProvider` subclass (`packages/vxrn/src/exports/prebuildWithoutExpo.ts`) that appends the five modules above.

Listing only `PlatformConstants` does nothing: the wait just moves to `DeviceInfo`, behind the same main-thread work. All five are needed so the JS thread never hops during eval.

## numbers

RAN: interleaved cold launches (warm-up round first, 10 rounds each, variants alternated), trace marks on. Times are from the app delegate init mark to the routed content mount (`mount_end`). The variants differ only by a launch argument that fed the same list.

| variant | eval ms (median) | delegate to routed content ms (median) |
| --- | --- | --- |
| base (no list) | 31.0 | 87.1 |
| `PlatformConstants` | 32.6 | 91.7 |
| `PlatformConstants`, `DeviceInfo` | 23.8 | 84.4 |
| all five | 19.2 | 78.0 |

RAN: final build with the five names hardcoded in the template, 10 cold launches after warm-up: eval 18.3 ms, delegate to routed content 75.9 ms. That run was not interleaved with a base build, so compare it against the table, not as its own A/B.

Gain: about 9 to 11 ms of the ~87 ms from app delegate to routed content, and about 12 ms of eval. Noise on this shared host is large (single launches range ±10 ms, outliers over 3 s), so read medians only. The trace marks add overhead; absolute figures are lower in an unmarked build.

## what remains

- RAN: after the fix, the delegate to routed content path is ~76 ms against 50 to 60 ms for a plain RN app. About 7 ms of that sits in instance init before `ImageLoader`, ~18 ms is bundle eval (diffuse, see above) and ~12 ms from eval end to routed mount.
- Main thread after `startReactNative` returns: about 8.5 ms of work I did not attribute. INFERRED: scene window and launch screen setup.
- Appearance's main-queue hop costs about 0.1 ms on the simulator, so the color-scheme `Appearance.getColorScheme()` cost seen on Mac does not reproduce here. No `color-scheme` change.
- The largest cost is outside JS. RAN in earlier measurement (air-32): 85 to 90 percent of One's simulator cold start is dyld loading 122 images (82 system frameworks, 34 Swift libraries) from the One pod's link set, pre-main 1.4 to 2.1 s against 0.21 s for the rival. It is unmeasured on a device, where it is probably much smaller. Owner: One's iOS pod link set.

## post-main investigation stopped on 2026-10-25

Owner direction, quoted by lead s72425 on 2026-10-25 UTC: "we don't need to optimize the startup anymore". Scope: stop this startup investigation, preserve its evidence and start no further builds or timing. No runtime optimization from this investigation is being shipped.

RAN: built the baseline checked out from `origin/main` at `9232b50183` and a plain React Native 0.88 Release rival on pro-64, using cached CocoaPods and prebuilt React Native. The baseline's first native compile took 2048 seconds and failed at the app probe link; incremental repairs produced successful Release builds. Diagnostic hooks were added to the app and generated bundle only. React Native and other dependency sources were not patched.

RAN: one diagnostic launch of each app under host load established that the probes reached routed content. These were separate launches without a warm-up or interleaved rounds. They are not a before/after comparison, cannot establish a gain and do not replace the earlier 75.9 ms result. The required warm-up and nine interleaved cold launches per variant were not run before the stop instruction.

| interval | One diagnostic launch ms | plain RN diagnostic launch ms |
| --- | ---: | ---: |
| app delegate init to content mount end | 119.55 | 111.08 |
| instance start to TurboModuleManager constructor start | 6.93 | 7.28 |
| TurboModuleManager constructor | 0.20 | 0.16 |
| script evaluation | 25.30 | 4.48 |

RAN: in the One launch, eager Worklets module construction took 1.00 ms, worklets initialization in JavaScript took 3.44 ms, and One's launch-screen holder took 4.38 ms. Initial URL resolution took 3.35 ms while render and mount work overlapped it. Evaluation end to routed mount end took 22.92 ms. The main-thread run-loop observer first reached its waiting boundary 27.60 ms after `startReactNative` returned; queued React Native work and UIKit work overlap that interval. The verbose probe adds overhead, including callbacks during evaluation. Its first One trace contains invalid bytes in asynchronous method-name fields; the probe was repaired afterward, with no subsequent launch. Read that trace with replacement decoding and disregard those fields.

INFERRED from source, supported by those diagnostic boundaries:

- React Native owns JS-thread startup, Hermes and ReactInstance construction, the legacy module registry scan, eager module setup, and UIKit screen constants before ImageLoader. The roughly 7 ms before TurboModuleManager also occurs in the rival. These dependency internals were left unchanged.
- Worklets owns its eager native module and JavaScript initialization. No worklets changes were made.
- vxrn owns the Vite/Rolldown native bundle. Its eager module initialization and Metro's lazy requires distribute work differently between evaluation and render. The evaluation durations alone cannot measure the framework gap; a full current per-module attribution was not completed.
- One/vxrn owns the generated app delegate, scene delegate, dependency provider list and launch-screen holder. The scene returns immediately after `startReactNative`; React Native assigns the root view controller and makes the window visible inside that call. The older attribution of all work after the return to scene/launch-screen setup is not established. That interval remains partly unattributed.
- One's router and its React Navigation dependency own the initial URL gate. React Native's iOS implementation reads launch options and user activity. One's lazy route imports suspend separately for layout and page modules, causing retries and intermediate mounts. Removing the URL gate would require preserving cold deep links; no contract change was attempted.
- One initializes the screens feature flags during the first root render. A candidate replaced its dynamic namespace require with a direct import. Its bundle built, but it was never launched or measured. The candidate was removed from tracked runtime source and retained only as an evidence patch.

RAN: diagnostic sources, original traces, build logs, generated bundles/maps and the unmeasured candidate patch were preserved on pro-64 at `/Volumes/CI/held-evidence/one-ios-postmain-r128005`. The evidence includes the earlier air-32 sources and captures. The measurement and analysis scripts were prepared but the paired measurement protocol was never run. This closes the investigation at the owner's request, with attribution incomplete and no additional performance claim.
