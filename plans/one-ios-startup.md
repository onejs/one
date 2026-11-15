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

## current optimization, 2026-11-09

The historical simulator measurements above do not describe the current React Native prebuilt dependency stack. The matched rebuild and current acceptance results live in `plans/one-ios-linkset.md`.

The shared-state installer now loads Worklets when installing the first shared state. A Release fixture checked a generated Foundation call, a native map and both directions of shared-state updates. Production lazy barrels were tried against the same native binary and rejected: ten alternating launches measured 523.7 ms to route commit with them enabled against 514.5 ms with them disabled. Production retains its existing setting.

Static `One` member reads now import their existing implementations directly. An ordinary `One.UI.Map` read no longer keeps every backend referenced by the frozen `One` object. Components and service objects retain their identities, and the platform getter remains live. Computed reads and namespace escapes preserve the original object. A real Release fixture using Map and Foundation now retains only the Foundation SDK table instead of thirteen SDK backends.

Two JavaScript experiments were rejected. Production lazy barrels increased route commit from 514.5 to 523.7 ms in ten alternating launches with the same native binary. Initial URL prefetch changed delegate-to-route time by less than 1 ms (74.17 versus 73.45 ms); it also added startup coordination, so the existing React Native initial-URL path remains unchanged.

`RCTContentDidAppearNotification` marks the router provider shell, not necessarily the page. Current comparisons separately record that notification and the target page's React layout-effect timestamp. The page and the plain RN control write the same Settings key; the launch harness subtracts kernel process creation time and waits on filesystem events. These are process cold starts with warm filesystem caches, not device reboots or pixel presentation times.


The Stack navigator now imports Reanimated's existing plain Fabric boundary directly, retaining its focus-dependent activation. A ten-pair Release comparison with the same native binary measured 79.82 ms median from delegate to route through the package entry versus 76.42 ms through the leaf. A minimal Stack fixture rendered and completed push/pop. Components using Reanimated animation APIs still initialize the package normally.

Final matched simulator medians are 386.68 ms to the delegate and 458.43 ms to route commit, versus plain RN's 303.91 and 363.74 ms. The reconstructed baseline was 668.45 and 742.63 ms. On an iPhone Air the final app measured 25.48 and 75.78 ms, versus RN's 18.14 and 50.55 ms. Full method, ranges and limitations are recorded in the link-set plan.
