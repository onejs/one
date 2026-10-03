# App Intents iOS 27 proof

RAN on studio-64 with Xcode 27.0 and an iPhone 17 Pro running iOS 27.0
(simulator `C75DA2BC-721A-491D-A8C4-65943DA33F67`). The fixture app declares
two build-time string actions in `vite.config.ts` (`One Echo Text` with a
Text parameter, `One Unhandled Action` without one) and defines the echo
handler in the native setup file `fixtures/app-intent-handlers.ts`, which
returns `JS:<text>` and counts calls in `One.Storage`.

`conformance.log` is the run's output:

- The genuine Shortcuts app finds `One Echo Text` in its action search and
  inserts it into a new shortcut (`app-intents-echo-editor.png`).
- **Warm:** with the One app running, the shortcut runs with `Warm-one` and
  Shortcuts shows `JS:Warm-one`, read back from the screenshot by Vision OCR
  (`app-intents-warm-result.png`). The OCR of the screenshot taken before
  play (`app-intents-before-play.png`) does not contain the result.
- **Cold:** the runner terminates the app, sets the parameter to `Cold-two`,
  and plays again. Shortcuts shows `JS:Cold-two`
  (`app-intents-cold-result.png`), and the app's PID changed from 88753 (warm)
  to 79162: Shortcuts launched a new process, and the handler from the setup
  file answered there.

`side-by-side.webp`, left to right: warm before play, warm result, cold
before play (still showing the warm result), cold result. Each PNG has a
compressed AX capture beside it.

## Not captured

The run stopped after the cold check (`outcome.json`: `passed: false`,
`spawnSync xcrun ETIMEDOUT`), so these checks have no screenshots in this
bundle:

- the cold app staying usable, and the receipt showing both calls reached
  JavaScript exactly once (`Receipt: 2|Cold-two`);
- `One Unhandled Action` failing with `E_APP_INTENTS_TIMEOUT` after 20
  seconds.

The cause was outside One. An orphaned `debugserver` launched from another
session's `~/contrast` checkout started two seconds after the cold process
and attached to it. The frozen app showed only its old launch snapshot
(`frozen-after-cold.png`) and could not be terminated. Killing that
debugserver released the process, but afterwards every per-device `simctl`
call (launch, terminate, listapps, screenshot) hung on both booted
simulators on the host, even after reboots and a CoreSimulatorService
restart, so the run could not be repeated there.

## Suite changes in this run

On iOS 27 Shortcuts the suite needed five fixes, all in
`one-native-conformance.ts`:

- it waits for the action sheet to stop moving before tapping search;
- it taps the result row's title, not a hidden same-label text over the
  category chips;
- it detects the inline parameter editor by its variable bar and reads
  the typed text from the action's label (`One Echo Text , Warm-one`);
- it deletes proof shortcuts whatever their action count, since Shortcuts
  keeps the name `New Shortcut`;
- it clears leftovers before the proof as well as after.

## Rerun

The simulator needs a hardware keyboard, since the suite types with HID key
events (`axe type`); with the on-screen keyboard showing, typed keys never
reach the field. In this run the hardware keyboard was attached after Device
Hub had launched once with default settings and the simulator rebooted. Build and install `NativeFeatureTests`, start
`bun run dev --port 8081` in `tests/native-features`, then:

```sh
bun tests/native-features/scripts/one-native-conformance.ts \
  --simulator-id <IPHONE_17_PRO_UDID> \
  --bundle-id dev.vxrn.native.tests --suite app-intents \
  --timeout 45000 \
  --app-path tests/native-features/build/derivedData/Build/Products/Debug-iphonesimulator/NativeFeatureTests.app \
  --js-location 127.0.0.1:8081 \
  --artifact-dir <DIR_OUTSIDE_THE_APP>
```

The native build came from `776768955` (`menu-picker-land`). Its
`packages/one/ios/Nitro`, `packages/one/src/platform/app-intents`,
`packages/vxrn/src/exports/prebuildWithoutExpo.ts`, fixture handler, and
`vite.config.ts` match v2-beta's blob for blob.
