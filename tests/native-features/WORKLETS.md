# Worklet runtime proof

`fixtures/one-native-gestures.tsx` exercises Reanimated layout transitions,
Gesture Handler's `usePanGesture` callbacks and Worklets' `runOnUI`. Native
callbacks report `isUIRuntime()` through `scheduleOnRN`. The runner also checks
view geometry: runOnUI moves the drag view 40 points, layout changes width from
72 to 180, and a physical pan finishes a timing animation at 120 points.
The web run checks the same visible changes and reports web execution.

In `tests/native-features`, build the existing app once with
`bun run prebuild:native`,
then build its generated iOS and Android Debug projects under `bun heavy`.
Claim an iOS 27 pool simulator with `~/team-machine/scripts/sim-claim.sh` and
lease an Android emulator before using it. Reuse those binaries across runs.

From the One repository root, start the focused bundle server:

```sh
bun tests/native-features/scripts/worklets-server.ts
```

`--fixture <name>` serves another file from `fixtures/` (default
`one-native-gestures`); both the native and web entries import it.

Use port 8095 for the claimed iOS app's `RCT_jsLocation`. The iOS bundle ID is
`dev.vxrn.native.tests`. On Android, package `dev.vxrn.nativefeatures.tests`,
set `debug_http_host` in its default shared preferences to `localhost:8081`
and reverse device port 8081 to host port 8095. The server uses the native
production bundler for both platforms inside the Debug binaries, and the same
fixture through One's transform on
web. Its native entry registers `NativeFeatureTests` inside a safe area.
The focused entry does not initialize the full router or its Fast Refresh runtime.
Restart the server after changing either fixture file. It builds both native
bundles before printing its ready message. Save the served bundles for receipts:

```sh
curl --fail 'http://localhost:8095/index.bundle?platform=ios' -o /tmp/worklets-ios.bundle
curl --fail 'http://localhost:8095/index.bundle?platform=android' -o /tmp/worklets-android.bundle
```

The focused native entry uses One's standalone safe area view with its native
initial metrics. The layout transition stays attached from mount; its callback
reports only after an explicit resize request, so startup inset changes cannot
satisfy the assertion.

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

For a queued server, wait on its ready log receipt with
`scripts/watch-worklets-ready.py <admission-pid> <log>` inside one detached
`tm wait`. The watcher observes file writes and process exit with kqueue;
it rejects process exit without a ready receipt. RAN: both watcher outcomes
passed a subprocess check.

RAN: final proofs use the rebuilt compiler after automatic Babel fallback
removal, production native JavaScript and the fixture at `af3dbde4c`. Native
callbacks report UI execution; web callbacks report web execution. The iOS
simulator initially ignored input in both the fixture and the native Settings
app; rebooting only the claimed device restored input and all checks passed.
Both device claims were released after recording the final captures.

RAN: compiler tests 95/95; React Compiler/worklet/required-transform/source-map
checks 27/27. The broader native engine suite remains red: filesystem HMR tests
time out, and one full run failed a source-map assertion that passes in the
focused run. These failures were retained. No retries, skips or timeout increases
were added to the tests. They need separate investigation; this fixture proves the worklet
path on the three targets, not the whole native engine suite.
