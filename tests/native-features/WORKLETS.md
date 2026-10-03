# Worklet runtime proof

`fixtures/one-native-gestures.tsx` exercises Reanimated layout transitions,
Gesture Handler's `usePanGesture` callbacks and Worklets' `runOnUI`. Native
callbacks report `isUIRuntime()` through `scheduleOnRN`. The runner also checks
view geometry: runOnUI moves the drag view 40 points, layout changes width from
72 to 180, and a physical pan finishes a timing animation at 120 points.
The web run checks the same visible changes and reports web execution.

Build the existing native-features app once with `bun run prebuild:native`,
then build its generated iOS and Android Debug projects under `bun heavy`.
Claim an iOS 27 pool simulator with `~/team-machine/scripts/sim-claim.sh` and
lease an Android emulator before using it. Reuse those binaries across runs.

From the One repository root, start the focused bundle server:

```sh
bun tests/native-features/scripts/worklets-server.ts
```

Use port 8095 for the claimed iOS app's `RCT_jsLocation`. The iOS bundle ID is
`dev.vxrn.native.tests`. On Android, package `dev.vxrn.nativefeatures.tests`,
set `debug_http_host` in its default shared preferences to `localhost:8081`
and reverse device port 8081 to host port 8095. The server uses the native
bundler for both platforms and the same fixture through One's transform on
web. Its native entry registers `NativeFeatureTests` inside a safe area.
Restart the server after changing either fixture file, then restart the app.

Run each proof against a fresh mounted fixture:

```sh
bun tests/native-features/scripts/worklets-proof.ts --platform ios --device "$ONE_SIM_UDID" --axe "$ONE_AXE_PATH"
bun tests/native-features/scripts/worklets-proof.ts --platform android --device "$ONE_EMULATOR_SERIAL"
bun tests/native-features/scripts/worklets-proof.ts --platform web
```

`ONE_AXE_PATH` is the bundled axe executable from xcodebuildmcp when axe is not
on PATH. Results default to `/tmp/one-worklets-proof/<platform>`: initial and
final screenshots, observations at each condition, and `outcome.json` only on
success. Release both devices afterward.

RAN: iOS 27 simulator, Android API 37 emulator and headless Chromium passed the
runtime and geometry checks on 2026-10-03. The native debug builds included
concurrent native service/navigation edits, so this is a runtime fixture proof,
not a clean-install proof of the complete real-app matrix. The retained
observations are in `evidence/worklets/runtime.json`.
