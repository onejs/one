# Android native share target device evidence

RAN on 2026-10-01, session `s5653`, studio-64, from One `v2-beta`
checkpoint `38841b22d`. This closes the preceding evidence's Activity/device
validation gap for the native sharetarget package. It does not validate the
parent's generated One project, public binding, TM authentication or transport.

## Actual defect and minimal fix

The initial real device screenshot `before-keyboard.png` shows the software
keyboard covering both the editable message and Send/Cancel. The title also
intersects the status bar. The AX dump still places the editor at
`[42,2001][1038,2169]` and Send at `[829,2243][1038,2348]`, under the IME.
The input method dump reported `mInputShown=true`, `mImeWindowVis=3`.

The sole runtime source change adds `enableEdgeToEdge()` and
`systemBarsPadding().imePadding()` to the Activity's shared Surface. The
existing picker/composer and model behavior are preserved. On the rebuilt APK,
`after-keyboard.png` visibly shows the same edited text and selected session
above the keyboard. AX places the editor at `[42,1118][1038,1286]` and Send at
`[829,1360][1038,1465]`. A tap there invokes the actual native adapter.
`native-keyboard-before-after.webp` is the single side-by-side comparison,
encoded at WebP quality 90. It was visually inspected, as were the original
screenshots, error, rotation and multiple-share keyboard states. The own-session
`tm share --json` receipt is `tm-share-receipt.json`.

## Resource ownership

Initial `adb devices -l` returned an empty list; no emulator/qemu process held
an AVD. Existing `android_lane_pixel_8` was used, with no new AVD or emulator GUI.
The UUID claim `FC152722-68F7-52FE-B33C-7C54F5DA67D1` is UUIDv5 of
`android-avd:studio-64:android_lane_pixel_8`, registered with
`~/team-machine/scripts/sim-claim.sh claim ... --name android_lane_pixel_8`.
The script is iOS-only in its UUID validation and boot/suppression logic; the
claim records ownership, while an atomic `mkdir /tmp/one-android_lane_pixel_8.claim`
additionally locks the AVD name and serial. Its owner was `s5653`.

Own qemu PID was 54770; all adb calls used `-s emulator-5580`. Launch flags:
`-avd android_lane_pixel_8 -port 5580 -no-window -no-audio -no-boot-anim
-no-snapshot -cores 2 -memory 1536 -gpu swiftshader`. The existing API 37
image raised RAM to its 4096 MB minimum. Display: 1080x2400, density 420.
`resource-ownership.txt` preserves the actual process/claim listing.
Keyboard was explicitly enabled with `show_ime_with_hard_keyboard=1`.
Only the claimed device was driven; no other simulator/process was stopped.
Cleanup is recorded in `resource-cleanup.txt`.

## Compiled native harness

The existing root library still compiles the actual sharetarget source files.
The minimal `harness/sample-app` application supplies a concrete
`makeAdapter(context)`/explicit limits subclass, exported SEND and SEND_MULTIPLE
filters, a real ContentProvider with two text fixtures, and a fixture sender
that builds Parcelable EXTRA_STREAM and ClipData URI grants. No copied source,
React, JS or network transport is involved. Explicit debug receiver broadcasts
control app-private destination/send gates. The stub records exact payloads,
submission ids and idempotent delivery files.

The fixture sender has a separate task affinity. Each manual launch uses
`am start -f 0x18000000` so Android executes the sender rather than restoring an
old task's base intent. Its outbound share targets the existing singleTop
receiver with NEW_TASK/CLEAR_TOP/SINGLE_TOP. Warm evidence requires the
`warm_intent` event, not just an am-start success. Exploratory stale-task
launches in `adb-transcript.txt` are not counted as warm validation.

RAN in `packages/one/android/Tests/ShareTarget/harness`:

```sh
ANDROID_HOME=/Users/n8/Library/Android/sdk \
  /Users/n8/.gradle/wrapper/dists/gradle-9.4.1-bin/arn2x92ynaizyzdaamcbpbhtj/gradle-9.4.1/bin/gradle \
  :sample-app:assembleDebug compileDebugKotlin testDebugUnitTest \
  --console=plain --no-daemon --max-workers=2 -Dorg.gradle.jvmargs=-Xmx1536m
```

Exact output in `fixed-build-tests.txt`: `BUILD SUCCESSFUL in 17s`,
`73 actionable tasks: 10 executed, 63 up-to-date`. Copied JUnit XML reports
17 intake + 10 retained-model tests, zero failures/errors. After adjusting
only the sample manifest, RAN `:sample-app:assembleDebug` with the same flags:
`BUILD SUCCESSFUL in 7s`, `56 actionable tasks: 5 executed, 51 up-to-date`
(`sample-final-build.txt`). The final installed APK digest is `apk-sha256.txt`.
No extra automated appearance tests were added.

## TESTED device acceptance

The consolidated final device pass starts after `pm clear` of this harness app.
`events.jsonl` contains only that pass; `adb-transcript.txt` contains the actual
commands/results including exploration. Full unrelated system dumps were
omitted from that transcript; scoped observations are above.

- **Cold SEND:** `final-cold-single.png/.xml` shows verbatim initial text in
  the editable Message field plus alpha.txt, copied from a real content URI.
  Selecting the second native radio button and entering text produces
  `after-keyboard.png/.xml`. Send was tapped with the IME visible.
- **Native error/retry:** `send-error.png/.xml` shows the transport error and
  Retry send. `send-error-state.json` records a pending delivery. Turning off
  `sendFail` and tapping Retry sends the exact same id, destination, text and
  attachment content. Id `235bc402-46e9-41a6-826e-cc5f887da6cc` has two attempts,
  one failure and one delivery marker. `retry-delivered-state.json` has no draft.
- **Warm SEND / cancellation:** the real `onNewIntent` event accompanies
  `warm-single-replacement.png/.xml`. Before/after Cancel snapshots are
  `warm-single-before-cancel.json` and `warm-single-after-cancel.json`.
  Current draft `da260b98-4d23-4b91-ac8e-a958f9e136fa` disappears, including its
  copied attachment. The older persisted draft remains. Delivery markers do
  not change, and there is no send_start for the cancelled draft.
- **Cold SEND_MULTIPLE:** after force-stop, `cold-multiple.png/.xml` shows
  initial editable text plus alpha.txt (38 bytes) and beta.txt (37 bytes).
  Selecting the proof session and tapping Send while `sendBlocked=true` records
  id `31426aaa-c4ba-461d-b427-5b5a4beb2e0a` exactly once.
- **Rotation during gated send:** `sending-before-rotation` and
  `sending-after-rotation` PNG/XML/JSON capture portrait and landscape.
  A real recreated Activity logs `restored=true`; there is no new destinations
  call or second send. The retained phase remains sending (disabled picker,
  editor and actions), and the pending id/payload/disk draft are unchanged.
  Repeated Send/Cancel taps and hardware Back leave the same pending state
  (`rotation-repeat-actions.json`). `rotation-events.jsonl` captures the log
  before opening the next share.
- **Warm SEND_MULTIPLE isolates the old send:** `warm-multiple.png/.xml` and
  `warm-multiple-before-old-release.json` show a new editable two-file share,
  id `e84b7b7b-6084-439f-b3c7-486dfddd6695`, while the old id stays pending.
  Releasing the transport gate delivers/deletes only the old draft. The new
  Activity remains open with unchanged text/files (`warm-after-old-delivery`).
  Selecting its proof session, editing and tapping Send above the visible IME
  (`warm-multiple-keyboard.png/.xml`) delivers only the new id, with both exact
  copied file contents and the edited text.
- **Destinations failure/retry:** `destinations-error` shows native error,
  Cancel and Retry. Releasing `destinationsFail` and tapping Retry yields
  `destinations-retry` with the original text and identical copied file URI;
  intake was not repeated. Cancel removes that owned draft without a send.
- **Manifest discovery:** actual package-manager queries for SEND and
  SEND_MULTIPLE with text/plain each return exactly the generated harness
  receiver (in the adb transcript).

A behavioral audit of the captured JSON succeeded (`verification.json`):
`result=PASS`, `send_start_count=4`, `send_failure_count=1`,
`unique_deliveries=3`; attempts per id are 2/1/1. The audit checks exact retry
payload equality, rotation state equality, owned cancellation, warm isolation
and destination retry without recopying. It does not infer UI appearance from
source strings or substitute unit tests for device interaction.

Constraints: fixture transport and same-app URI provider only. Cross-app
permission boundaries, process-death Activity recovery, production network
idempotency and generated-project integration were not exercised here. One
older ready draft intentionally remains discoverable after warm replacement;
`final-state.json` distinguishes it from all cancelled/delivered drafts.
