# One native Android lane

## DocumentPicker receipt, 2026-10-09

TESTED: `w-941983` passes Android `document-picker`, sixteen checks; a seed
with equal-length altered UTF-8 bytes fails `document-picker-single-exact-bytes`;
restored seeds pass sixteen checks again. The real system picker cancels,
selects one file, then selects two. Name, MIME type, size, distinct file URIs,
JavaScript fetch length and exact native cache bytes agree. Fresh run-specific
seed names avoid deleted Downloads entries; device seed bytes and the closed
roots drawer are preconditions. No native One repair was needed.

RAN: the existing Pixel 8/API37 r06 and accepted Network APK run from the
shared beta checkout. Captures, XML and logs remain at
`/tmp/one-android-hooks-m28192/document-accepted-v5/` on air-32. Earlier
picker-navigation failures and their captures remain beside them. Cleanup
removes owned seeds and stops Metro8098 and emulator-5560. CI owner: s23249.

## Network receipt, 2026-10-09

TESTED: `w-16b178` passes the Android `network` suite, twelve checks,
then its frozen-hook negative control fails the offline assertion while the
independent listener reports offline; restored source passes twelve checks.
Wi-Fi and mobile-data transitions exercise getters, hook and observer,
observer removal, continued hook delivery and two monitor restarts.
Cleanup awaits the restored live connection before another Metro launch.

RAN: baseline `w-d2e468` leaves the hook online after Android has no active
network and an explicit native getter reports offline. The repair derives
listener state from callback capabilities, with `onLost` emitting offline,
instead of reading synchronous ConnectivityManager getters from callbacks.
The Android callback contract documents the stale-state race:
[NetworkCallback](https://developer.android.com/reference/android/net/ConnectivityManager.NetworkCallback).

RAN: `w-b01035` prebuilds Android and compiles arm64 `:app:assembleDebug`,
370 tasks in 5m03s. APK SHA256:
`fa3c1aa28d38d0ad58ba01840ac6bf0dd87cc8c7d7060fbb387b1c1be510771d`.
Candidate Network Kotlin SHA256:
`f902f774b8f68c8a8ecb7f3e51943a4e2b3c9186e48d9671b604715e4c9426a5`.
Receipts remain in `/tmp/one-android-hooks-m28192/network-accepted/` on air-32.
The initial repaired restored launch failed before mounting because the radio
was still reconnecting; no API assertion was relaxed. CI owner: `s23249`,
Android Native Build, Checks and Tests, and canary artifact delivery pending.
RAN: `w-4e84c6` builds and installs all seventeen package-family entries
with `SKIP_TYPES=1 bun release --into` the isolated Contrast downstream.
The installed Network Kotlin matches the accepted source byte for byte.
Receipt: `network-downstream-release.log` beside the runtime evidence.

## Native state receipt, 2026-10-09

Android acceptance is limited to One-owned controls, APIs, bridge behavior and flat-device adaptive state. Third-party graphics libraries are outside this lane.

TESTED: `w-67eef2` passes the Android `state` suite, six checkpoints, on the
existing flat Pixel 8/API37 r06 with the existing arm64 debug APK. Native text
edits update `.value`, `.get()` and a second bound field; a JavaScript write
reaches both fields; a distinct handle remains untouched; a native switch
updates the hook and second switch. The deliberate `--negative-control`
disconnects the shared field, fails its exact value assertion, and restored
source passes all six checks again. No native One repair was needed.

RAN: the same AVD boots with `-gpu host -no-snapshot-load`, and
`sys.boot_completed=1` precedes install. Prior software-rendered boots exposed
a System UI startup ANR before One assertions. Primary-checkout edits vanished
during resource admission. The recovered source now lives in the shared beta
checkout; the earlier private trees are retired after preserving evidence.
Receipt PNG/XML/check records and pass/fail/restored logs remain outside Git at
`/tmp/one-android-hooks-m28192/` on air-32. Every successful check has its own
status JSON; the original runner's early suite return emits no success
`status.json`. The older failed root `state/status.json` is retained as a
startup-failure receipt, not used for acceptance. CI owner: `s23249`.

## Android native suite assignment, 2026-10-09

Scope: One's own controls, APIs, bridge, Android behavior and Peach parity.
Third-party libraries such as WebGPU and Three.js are excluded.

Work in this lane proves One's Android exports with the existing native-features
runner and fixtures, fixes any One runtime defects they expose, generates
`tests/native-features/COVERAGE.md`, and commits each passing suite with its
validation to `v2-beta`. Each suite includes a behavior assertion and a
negative control. CI delivery is owned by `s23249` (`one-v2-beta-ci`).

Priority order: `One.openURL`, `One.openShare`, `One.openSettings`,
`One.Database`, `One.Android.Menu`, `One.Android.ContextMenu`,
`One.Android.Color`, `One.UI.Image`, `One.UI.TextInput`, `One.UI.Icon`,
`useNetworkState` and `One.Network`, `One.DocumentPicker`, `useNativeState`,
`One.LaunchScreen`, then `One.UI.Blur`, `One.UI.Mask`, `One.UI.EdgeFade` and
curve helpers, then size-class, hinge, and reserved-region hooks with flat-device
proof only. `One.UI.PictureInPicture` is excluded.

## Current split, 2026-10-09

Current lane allocation: this session covers `One.openURL`, `One.openShare`,
`One.openSettings`, `One.Database`, `One.Android.Color`, `Menu` and
`ContextMenu`. The other Android UI view and hook rows remain in their sibling
lanes.

Owner: android-m27558 (m27558), manager and One native Android hands-on owner. Validated runtime fixes are re-anchored on current rewritten `v2-beta` in `tm/android-native-runtime-accepted`. This lane owns Android Native Build, Checks and canary verification for its pushes; Contrast shared delivery stays with m23914. REVIEW: none.

TimeInput acceptance, 2026-10-09: TESTED the existing One dialogs fixture on
the light Pixel 8/API37 r06. Its TimeInput crop failed at 1.272432% before
the simulator repair and passes at 0.299733% after. All seven dialog/picker
checkpoints pass the unchanged 1% budget with matching bounds. All fourteen
captures, final three identical raw frames and forty-three seeded native color
roles authenticate. Six library and fourteen core text/input checks pass.
Native APK source `4b182dd316` and One Kotlin are unchanged. The repair ships
in Contrast `e81dba5b092435c5bd8b284823804264a5b7bd25`; no One native fix or
release is required. Source identities, grades and receipts remain outside
One git in Contrast `scripts/tmp/android-m27558/timeinput-accepted-verdict.json`
on pro-64 and air-32. Contrast delivery is assigned to m23914. Broader Android
UI, lifecycle and deployment scope remains open in the Contrast lane plan.

Runtime acceptance, 2026-10-08: RAN `r66696` passes the full unchanged Audio
suite on the pinned pro-64 Pixel 8, Android 17 API 37 r06. Recording, playback,
pause, seek, resume, stop and URI/state errors pass. Background playback advances
32,609 ms over 32,650 ms while remaining playing. Real GSM focus interruption
reports began/ended events and leaves playback paused; remote pause/play,
metadata errors and session clearing pass. The native build's guarded Kotlin
files and APK hashes match the candidate. Its APK SHA256 is
`e136a9296083ea44e40d7a8826f1b0094485e15b49a00c96c7bf34c9bc40814c`.
The setup fixture and all ten changed runtime/build paths retain their bytes
when carried onto beta `aaeee8308`. No old rewritten history is merged.

RAN the background fixture first failed on an active event before a captured
background transition. A private React runtime probe reproduces that error,
then passes after the listener waits for its actual background phase. Duplicate
background events preserve the first capture; missing transitions and stopped
playback still fail. The native suite retains every original assertion and
deadline. Owned cleanup uninstalls the fixture, stops emulator and Metro8107,
and leaves no device or listener. Evidence stays outside One git in Contrast
`scripts/tmp/android-m22158/runtime-audio-background-phase/` on pro-64 and air-32.

Published Audio delivery, 2026-10-08: RAN `one@2.0.0-beta.362.1`
identifies source `6b489d521782af129132654d2baeb318f4bc2fdc`, which contains
accepted Audio fix `345ea28754a050be99d2b599f9f3559d72a7643e`.
Both published Audio Kotlin files match that accepted source byte for byte.
Tarball SHA256 is `bf134f168553854e783da173c936537cf0d59c735d59f73995ee2f1411eb497a`.
RAN required Android Native Build `37718671441` and Checks and Tests
`37718671504` both pass at `c4d7aa156256c89dbdc96bc44494ba852da8e2aa`.
Artifact and CI receipts stay in Contrast `scripts/tmp/android-m22158/`.
Release and Contrast upgrade follow-through is owned by a24912.

Picker comparison, 2026-10-08: RAN `r67636` passes seven native checks on
Pixel 8/API37 r06: initial date, 12-hour and 24-hour clocks, both dialogs,
date dismissal and time confirmation. The existing controlled rejection and
lifecycle fixture is unchanged. The separate reference route uses March 12,
2031, 10:15 and explicit colors matching Expo's seeded picker bodies.
Kotlin, JavaScript, fixture and APK identities are retained outside One git;
the run removes its app, emulator and Metro8107.

RAN the named 1080 by 1992 picker-region comparisons with
`conformance-corpus/pixel-comparison`, threshold 0.1, radius 1,
antialiasing included, flat-shade tolerance 16 and the 1% budget:

| initial state | differing pixels / total | difference | threshold-zero audit |
| --- | --- | --- | --- |
| date | 594 / 2,151,360 | 0.0276104% | 0.3449446% |
| 12-hour time | 747 / 2,151,360 | 0.0347222% | 0.2019653% |
| 24-hour time | 128 / 2,151,360 | 0.0059497% | 0.0230552% |

TESTED the dialog tint repair: the four OK/Cancel labels previously painted
`#4C5E8B` despite explicit `color="#65558F"`; the same native label-bounds
probe found zero requested-tint pixels in every action. After sharing Material
button colors from the existing picker tint, `r68291` passes all seven unchanged
native checks and all four color probes. Each OK label contains 413 opaque
`#65558F` pixels, each Cancel label 767; the required minimum remains 100.
The original controlled rejection and lifecycle fixture remains unchanged.

RAN the repair compiles on pro-64 in 19m25s, 370 Gradle tasks. APK SHA256 is
`1f240fd4c5b5ab39b1df5111f5f2214cc283f44efaf82185a49c1ea38c7d9623`;
its delivered picker Kotlin matches
`aff4dead27ce583d1185ac2c825d44d5a69916b48a4fcfad12a7f18ee5d2c313`.
The unchanged native Compose view also matches its receipt. Builder cleanup
reports exit 0 and released resources. Runtime cleanup removes the installed
app, emulator and Metro8107; final device and listener reads are empty.

RAN repeated inline pixel grades retain the table above. Full-frame dialog
diagnostics after tint repair are 0.4950231% for date and 0.4839892% for time.
Their headers, status chrome and outer host themes differ; these numbers do
not establish an exact host-theme match. Threshold-zero audits are 1.2304012%
for date and 26.3607253% for time. The native default theme is unchanged and
no public API is added. Captures, grades and source guards remain outside One
git under Contrast `scripts/tmp/android-m22158/runtime-one-picker-dialog-tint/`
and `picker-tint-accepted/`. The next Metro startup reached its prepared bundle
45 seconds after launch, including the parallel emulator startup; its saved
log contains no Watchman cookie timeout. Incremental native workspace retention
is queued with RSI after this cold build executed every Gradle task.

Published picker delivery, 2026-10-08: RAN Android Native Build
`37735062538` passes at `82a413d12c`; both Checks jobs pass in
`37732571679` at docs repair `681b3a4cc5`. Publish step `37733771858`
passes at `c11472e03e660347fd75c8273ba85131ea681a1a`.
Exact npm artifact `one@2.0.0-0.canary.1791438659890` identifies that source,
which contains the accepted picker fix. Its picker, Compose view and both
Audio Kotlin files match the accepted source byte for byte. Tarball SHA256
is `18a8d086600a5cba15a2f87bc19889da939e1c52c633bff99a5875608f431aa8`.
The source repair formats a docs reference as inline code; actual MDX and
React SSR reproduce the original undefined `Head` error and pass after repair.
Runtime, required CI and published source acceptance are closed for the tint
fix; exact dialog host-theme matching remains open. Receipts stay outside One
git in Contrast `scripts/tmp/android-m22158/picker-canary-verified/`.

Prior launch failures stopped before Audio assertions: an index route instead
of the requested deep link, a System UI keyguard ANR, and conflicting AVD leases.
The private initial URL reader returned HTTP404 at One's inspector endpoint,
so the proposed 150 ms linking race remains unproven and no production linking
change is made. Normal heavy admission now precedes a kernel event wait on the
observed live AVD owner, removing a queue gap before the same atomic lease claim.
The full passing suite follows that ordering without interrupting another run.
RSI admission defect `t-muyp6nvp-1zpy0` remains separately owned.

Current restart, 2026-10-07: the brief from p67073 resumes this lane on Nate's
word: "android like peach SIM support yes and one native yes definitely".
RAN: cold-start AppIcon acceptance passes on `6e3040d3f` with all eight
focused checks. Native JavaScript setup requests support before router
mount; the screen reports `Startup support: true` and `Supported: true`.
Alternate switching preserves process and focus; cold relaunch persists
the alternate, primary restoration and invalid-input rejection pass.
Native sources are unchanged, matching APK SHA256
`652f08da010fc553c4ed1a48874e54aa3af4d6f6e03a8581dfcbc92be0017a5d`.
No native AppIcon repair is justified by this run. The original 167 focused
fixture, barrel, Compose and native documentation tests also pass.

Raw runtime captures, hierarchy/status records, logs and cleanup live on
pro-64 and air-32 under Contrast `scripts/tmp/android-m22158/runtime-app-icon/`.
Cleanup uninstalls the owned fixture and stops the owned emulator and
Metro8107; saved final device and listener reads are empty. Metro8097 belongs
to the OpenURL lane and stays untouched. Peer preparation and runtime shells
`r65607` and `r65637` have exited. RAN: the media rerun passes 7 Contacts, 18 Calendar and 27 Photo checks.
The runner now restores the chosen Metro host and Android 17 dev-network
permission before every cleared launch. Contacts cancellation targets a new
native picker activity instance after selection. All original API assertions
and deadlines remain. Native Audio then crashes during record/play with
`ForegroundServiceDidNotStartInTimeException`; the saved log identifies
`OneAudioService` and its STOP action. INFERRED: stopping before pending
foreground promotion causes the crash. The candidate promotes first, even
when STOP arrives before the initial start callback. RAN: the
candidate compiles, 370 Gradle tasks in 17m25s. APK SHA256 is
`880abd45dee2b732d3aa50744f650d32a468d24ba940d884773f6ead569ab655`;
its Kotlin source matches the candidate and the build cleanup receipt reports
released resources. The first repaired runtime returns
`Status: error at play: playback did not advance: failed 1718`. Native logs
record `getDuration` during Preparing, then error `-38`. INFERRED: the loading
status read corrupts the MediaPlayer state. The next candidate returns loading
or failed status without querying that player, and now-playing metadata reuses
the same guarded status owner. RAN: the guarded candidate compiles on pro-64, APK SHA256
`e136a9296083ea44e40d7a8826f1b0094485e15b49a00c96c7bf34c9bc40814c`;
both Kotlin source hashes match. Two subsequent runtime attempts reached no
API assertions because the Pixel 8 lease was held after capacity admission.
The later full Audio acceptance above supersedes these admission-only attempts. Evidence stays in Contrast
`scripts/tmp/android-m22158/runtime-audio-promotion/`. RAN: final device and
Metro8107 reads are empty and the emulator lease was released.

RAN: local `bun release --into` installs all 17 package-family entries into
isolated Contrast `~/.worktrees/contrast-android-one-audio-downstream`. It reuses
JavaScript outputs built from `aaff03e29`, whose package JavaScript matches this
native-only candidate. The downstream service source matches byte for byte.
This was package content verification before the full Audio acceptance above. RAN: all eight remaining focused Compose
suites pass on pro-64 using the unchanged APK, 45 checkpoints plus AppIcon's
eight checks. Badges, list slots, flow wrapping, icon/FAB/toggle interactions,
loading, Surface rejection and acceptance, progress and segmented controls
pass. This also validates the migrated debug-host caller. Full native captures
and empty final device/listener reads remain in Contrast
`scripts/tmp/android-m22158/runtime-conformance-host-fixed/`; a native-density
quality-90 controls capture was inspected and shared.

The Audio candidate build uses the existing `SKIP_TYPES=1` JavaScript graph
mode before native prebuild and Gradle on a cold builder. RAN: the guarded
candidate's local dispatch failed before native compilation with TS2307 for
`@tamagui/web/internal-runtime`. Turbo's strict task environment omitted
`SKIP_TYPES`; its build task now declares that input so the flag reaches the
builder and JavaScript-only output has a distinct cache key. The ordinary
declaration baseline remains open. Both Kotlin candidates compiled. The
guarded playback read still needs runtime acceptance. RAN: the source-pinned
Expo library APK and instrumentation APK build passes, 1696 Gradle tasks in
16m24s. Their hashes, fixture and lock match source `5cd581266e` on pro-64;
the repaired four picker tests pass on the native oracle in 115 seconds
and on Peach in 95 seconds, with ten inspected native captures. The test
repair lands in Contrast at `ea2637b02d`; paired fidelity remains open.

Evidence remains outside One git in Contrast
`scripts/tmp/android-m22158/runtime-media-picker-fixed/`. Cleanup removed
Metro8107, the owned emulator and fixture. The three earlier media runs retain
the original boot failure, picker failure and passing Contacts diagnostic.
Peach owner s16717 works its width candidate. RAN: the six owned commits were rebased onto rewritten `v2-beta` at
`2611d1957` in new branch `tm/android-native-rewritten`; old `4d946b837` is
absent from its ancestry. Audio Kotlin, debug-host/media drivers, AppIcon
fixtures and Turbo configuration match the pre-rewrite candidate byte for
byte. The old save point remains local for recovery; the new branch receives
an ordinary push. No captures or
logs are committed. Android service promotion requirements are documented in
[Android foreground service lifecycle](https://developer.android.com/develop/background-work/services/fgs/stop-fgs)
and [ActiveServices](https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/services/core/java/com/android/server/am/ActiveServices.java).

The preceding wind-down passed 79 system checks on `f29ae4b7a`; both owned
worktrees and all owned processes were removed. Audio runtime, paired Expo UI fidelity, host lifecycle, IME,
predictive back and insets remain open in this restart.

## Android restart, 2026-10-07

Nate, quoted by the coordinator: "android like peach SIM support yes and one native yes definitely". Scope resumes One native Android UI parity, followed by Android native API proof. Peach simulation remains with peach-android (m21620), notified at this lane's start. This restart supersedes historical stop and review holds; public API choices remain owner decisions.

TESTED: the first unit restores fresh-install Android debug-host startup and passes all 15 existing Compose picker checkpoints on the standard Pixel 8/API37 r06. Rejected and accepted dates, disabled dates, time selection, confirm/cancel, reopen and remount pass. Initial failure `w-38b2` retains the local-network prompt and missing Home marker. READ: RN 0.87.1 defers Metro connection until `ACCESS_LOCAL_NETWORK` resolves. The runner granted it only after data clear. The repair moves that grant into shared debug-host setup, gated at API37; module-under-test permissions remain untouched. Repaired run `w-d72b` uses a cleared synthetic fixture, the unchanged APK, and source-matched local Metro on pro-64.

RAN: 31 Compose contract tests and 127 native documentation tests pass. Beast `w-2748` builds the 14-package One dependency graph from `cf508a1eb` in 3m46.889s. Android prebuild and arm64 `:app:assembleDebug` pass; `w-8e93` executes 370 Gradle tasks in 10m31s. `bun release --into ~/contrast --skip-build` installs 17 local package entries using those restored outputs. Native APK SHA256: `21547ef2b7da9f235d20569c05a70e9226a1574153bb9705ba26a791e275574c`. Runtime runner SHA256: `4b7f38dcf6d2390c1cc3db8de3d5380d91bd356e07b8b6ccfefe3b1ff7d528cb`. Picker fixture SHA256: `1fee3cf6edf6d4bcff696766c2a76f9cfd0c78b5209302f24f35fdc42502b8d4`. The intervening beta widget change is confined to iOS configuration and its own fixture; Android implementation and picker source are unchanged.

Evidence: committed proof. Full build logs, APK, failed startup and all 15 PNG/XML checkpoints remain in primary `tests/native-features/evidence/android-restart-p66065/`. Resource admission expiry and a prohibited SSH forward produced no behavior verdict; the successful proof serves Metro on the emulator's own Mac. Quality-90 WebP captures retain native 1080x2400 pixels and were inspected and shared with Nate. RAN: pro-64 adb lists no devices after cleanup, the owned emulator PID is absent and Metro8097 has no listener. Peach was notified that the AVD is released.

Peach integration request: keep source-pinned RN/Expo UI fixtures, native host sizing/lifecycle, IME receiving-window ownership, predictive back and inset semantics explicit. Runnable One entry: `cd tests/native-features && bun run dev --port 8097`, then `adb -s <serial> reverse tcp:8081 tcp:8097` and `bun scripts/one-native-conformance.android.ts --device-id <serial> --package-id dev.vxrn.nativefeatures.tests --metro-port 8097 --suite compose-pickers --artifact-dir <output>`. Build with `bun run prebuild:native --platform android` and `cd android && ./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a`; install that APK before the runtime command. Oracle: existing `sootsim_pixel_8_android_17_api_37_r06`. This acceptance covers One's picker contract; paired Expo pixel fidelity and the remaining Android API proofs are open.

Status: first unit runtime acceptance passes. Release run [37595722610](https://github.com/onejs/one/actions/runs/37595722610) passed for landed `9c7efefaa4834d767083da959ad16a4d104f40a9`. RAN: exact canary `2.0.0-0.canary.1791362684339` was packed; its manifest carries that `releaseSourceCommit`, and its Kotlin Compose source matches the worktree byte for byte. Receipt: primary `tests/native-features/evidence/android-restart-p66065/canary/content-receipt.json`. Checks run [37595722289](https://github.com/onejs/one/actions/runs/37595722289) failed while opening item 3 in the web intercept-modal test. The preceding beta failed a different Swift-transform timeout. The coordinator assigned the unrelated Checks repair and CI verdict to one-ci (s15186). Delivery remains open. Android Native Build run 37595722312 passed; iOS native was pending at the last snapshot. Broad UI parity and native API acceptance remain open. Full Compose acceptance now passes on pro-128. Next: post-land system/media API proof, preserving Peach's active pro-64 AVD. RAN: `w-95df` stopped before Home while the cold Metro bundle reached its loader after about 26 seconds. The blank screen and logs remain in primary `runtime-compose-pro128` evidence. `w-50db` passed after requiring a successful complete Android bundle response before on-device checks; the 15-second Home assertion and all behavior assertions remain unchanged.

## Current Compose acceptance, 2026-10-07

RAN: `w-50db` passes all 22 existing full Compose checkpoints on pro-128,
covering controlled Checkbox rejection, RadioButton selection, cards,
divider geometry, FilterChip rejection/acceptance/disabled controls,
AssistChip/InputChip/SuggestionChip events, disabled chips, Badge geometry
and Home navigation between screens. The historical chip tap failure did
not recur in this run. Proof and source identity
preserve the exact passing setup, output and captures. The setup requires a
complete successful Android bundle response before app startup; runner
timeouts and behavior assertions are unchanged. All full-resolution
PNG/XML checkpoints remain in primary `runtime-compose-warm-pro128`
evidence. Native 1080x2400 quality-90 captures and a detail crop were
inspected and shared with Nate. RAN: adb lists no devices and Metro8097
has no listener after cleanup.

Next: existing system API acceptance, then media API acceptance and the
remaining focused Compose suites. The API suite needs the existing
`prepare-android-app-icon-alias.ts` stamp before the app APK build;
the first picker/Compose APK lacks that fixture alias. Paired Expo pixel
fidelity, host lifecycle, IME ownership, predictive back and insets remain
explicit open objectives. CI verdict and unrelated Checks repair belong
to one-ci (s15186).

## Current system API acceptance, 2026-10-07

RAN: `w-8937` rebuilt the app on pro-64 at `4d7be9f17`, with the existing
`TestAlternate` fixture alias. The arm64 APK builds in 12m22s, 370 Gradle
tasks; APK SHA256 is `fc7e029c01282c976d4f882f52b5d4e8ebbd7202f266507f2c37e4c3da304784`.
The Pixel 8/API37 run passes 21 checkpoints through filesystem, Device,
KeepAwake before/after resume, portrait/landscape orientation locks and
unlock, and Share completion/cancellation plus error controls. Their
native-density quality-90 captures were inspected and shared with Nate.
Full evidence is preserved in primary `runtime-system-pro64` and
`apk-system` under `tests/native-features/evidence/android-restart-p66065/`.

The run stops at the Print checkpoint. RAN: saved XML and window dump show
the focused PrintSpooler with the rendered one-page PDF. The runner was
waiting for fixture status and mount markers behind that system window.
The candidate now requires the rendered selected page, Cancel button and
actual PrintSpooler focus before cancellation. Existing deadline and
cancel/busy/input/unavailable assertions remain. Focused runner TypeScript
and bundle checks pass; repaired runtime acceptance is pending. The API
sweep remains open. Emulator and local Metro stop on failure.

Resource expiry `w-6507` executed neither build nor probe. The API work moved
to owned pro-64 `~/.worktrees/one-native-android-api`, branch
`tm/one-native-android-api-p66065`; its remote execution adopts the tree for
the duration of each proof. The previous owned pro-64 tree is absent.
one-ci reports Checks green on `4d7be9f17`; incoming production sources are
unchanged, with the CI fixes confined to test hydration and transformer
warmup.

RAN: the Print candidate rerun `w-fb8e` passes the first 18 checkpoints,
then stops at Share before reaching Print. Android logs record the built-in
Copy action and chooser `RESULT_OK`; the fixture rejects either incomplete
results or missing activity names without distinguishing them. Android's
API35+ `ChooserResult` documents a null selected component for Copy. The
public `ShareResult.activityType` is optional. The next probe preserves the
existing assertion and includes the actual result in its failure message,
so callback loss and fixture contract mismatch can be distinguished. This
run provides no Print verdict. Raw evidence is retained separately from the
earlier successful Share capture.

RAN: focused system Copy probe `w-99e1` returns `{"completed":true}`.
Native completion is correct; the fixture's required activity name was
wrong for this action. The candidate now selects only the system `Copy text`
action, requires completed=true and an absent activity type, seeds the
clipboard with a different value, then verifies the exact shared text and
URL before continuing to file cancellation and error controls. The iOS
activity assertion is preserved. [Android's documented Copy result](https://developer.android.com/reference/android/service/chooser/ChooserResult#getSelectedComponent())
has no selected component. Native source and the APK remain unchanged.
Full repaired system acceptance, including Print, is pending.

RAN: `w-7c07` passes exact clipboard content, system Copy completion without
an activity name, file cancellation and all Share error controls. The saved
Print checkpoints also pass the focused, rendered PDF precondition and
cancellation/busy/URI/file/PDF/argument controls. Proof and source receipt
retain XML, status records and native-density quality-90 WebPs inspected
and shared with Nate. These fixture and runner repairs are validated;
native implementations and APK bytes remain unchanged. The outer wait lost
the peer transcript connection, but the owned execution continued. The
remaining system sweep and its cleanup receipt are pending. A single
kqueue process-exit watcher reads that execution's saved verdict without
polling. The API and paired Expo objectives remain open.

RAN: process-exit wait `w-69dc` failed before registration because this
peer's Python kqueue lacks context-manager methods. The corrected watcher
closes the queue explicitly. A controlled `/bin/cat` child on pro-64
delivers `NOTE_EXIT` and exits cleanly with that resource handling. The
native runtime was untouched; its exact process wait is being re-armed.

RAN: `w-b473` recovers the completed run's verdict: 35 checkpoints pass,
including Print unavailability and Quick Actions registration, warm/cold
delivery and clearing. AppIcon switching fails; the final Android hierarchy
and window focus show the launcher instead of the fixture. The owned
emulator and Metro are stopped, their PIDs are absent, and the peer worktree
is clean. Full source and raw evidence are retained in primary
`runtime-system-copy-content-complete`. INFERRED: disabling the aliases'
target activity in `HybridOneAppIcon.setIcon` removes the app's foreground
host. The focused `--suite system-app-icon` reuses the same assertions as
the full system sweep and records component state to test that cause.
Native repair is pending; no AppIcon success is claimed.

RAN: `w-a0e2` reproduces AppIcon failure from a fresh fixture install.
The component receipt lists `MainActivity` disabled and `TestAlternate`
enabled after the call; focus leaves the app. Its complete failure PNG is
1,317,000 bytes, validating the larger capture bound. The first focused
attempt `w-d0ba` reached no assertion because Android37 rejects shell
component-state mutation. The accepted setup uses only fresh installation
of the owned synthetic fixture, then removes it after preserving evidence.

The AppIcon candidate uses one default-enabled primary launcher alias and
disabled alternates, preserving the real host activity. It caches the APK's
immutable alias defaults once per hybrid object, reads current overrides
for selection, enables the next alias before disabling the previous one,
and restores the primary alias for an unnamed selection. The Android
manifest fixture and manual setup documentation are updated together;
the public JS API is unchanged. Stronger runtime checks require the same
process and app focus during each swap, persistence after a relaunch and
an unchanged primary selection after invalid input. Native build and
repaired emulator acceptance are pending.

RAN: beast `w-01ae` builds the package family from
`cd5fcdcd85a5cd7cdd88c8a48d4111cc2d2e711d` and passes all 158 tests
(31 Compose contracts, 127 native documentation checks). The delivered
source receipt matches the local Kotlin implementation, runner and manifest
writer hashes. `bun release --into ~/contrast --skip-build` installs the
17 package entries from those exact outputs. Contrast's installed AppIcon
Kotlin SHA256 is `ee47f8d6d7e127412cbe2d63a6523a9377fc8823333bdea2e6f8c9ccbc7141ef`;
its package manifest and lockfile hashes remain unchanged. The owned pro-64
proof script rebuilds the changed Android target, requires the manifest
writer to be byte-idempotent, and runs the focused AppIcon suite on a fresh
synthetic fixture. Native compilation and runtime acceptance are pending.

RAN: `w-d57d` compiles the changed arm64 Android app in 6m32s,
47 Gradle tasks executed and 323 up to date. The focused runtime mounts the
app and opens AppIcon, then the outer peer transcript reports its cloud
writer stopped. Its owned script remains running as PID93161 on pro-64.
Runtime acceptance and cleanup are unconfirmed. The existing process-exit
watcher now accepts an exact script and suite; a controlled receipt probe
accepts the AppIcon success marker and rejects it for the system suite.
One detached process-exit wait will recover the saved runtime verdict.

RAN: `w-164f` recovers the AppIcon failure and the final cleanup receipt.
MainActivity remains enabled, but the Android event log finishes the running
`.Primary` activity with reason `disabled-package` when the alias switches.
The first candidate therefore does not preserve the running window. The
owned emulator and Metro are stopped and the peer tree is clean. This
corrects the earlier inference that preserving the target alone suffices.
[Android's activity cleanup](https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/services/core/java/com/android/server/wm/RootWindowContainer.java)
matches the running component, including its alias.

The revised fixture and documentation route launcher aliases through a
small app-owned Activity into the permanent MainActivity. It finishes
before React Native mounts, carries the launch intent into the host, and
uses the existing host for warm launches. One's discovery excludes aliases
that directly target its running host. No public JS signature or prebuild
configuration option is added. RAN: the generated manifest and forwarder
source are byte-idempotent across two runs. The stronger runtime assertions
are unchanged; rebuilt Android runtime acceptance is pending.

RAN: `w-702d` stops before runtime at Kotlin compilation: the alias helper's
parameter is Android Context, which has no currentActivity property. The
revised host lookup uses the existing Nitro React context, matching the
class's currentActivity helper. No emulator or Metro was started. The failed
compiler log is preserved; a cached native target rebuild is pending.

RAN: `w-9f3f` compiles in 19 seconds, but its switch still loses the
screen. The launcher Activity finishes and MainActivity renders; the saved
transition shows that the task's base intent remains `.Primary`. Android
then removes that task with reason `disabled-package` despite its permanent
top activity. [RecentTasks cleanup](https://android.googlesource.com/platform/frameworks/base/+/master/services/core/java/com/android/server/wm/RecentTasks.java)
compares the task's base intent to disabled component names.

The revised launcher has an empty task affinity, is excluded from recents,
and starts the host with NEW_TASK. One checks the current app task before
advertising support or switching; an alias-rooted task rejects before any
component state changes. This adds one task snapshot per support query or
user-initiated swap, with no render-path work. The runner now retains its
before-switch activity state alongside the process and component receipt.
RAN: the revised manifest and Kotlin writer remain byte-idempotent. Native
rebuild and the unchanged focused runtime assertions remain pending.

RAN: `w-eb5a` stops before runtime because the SDK marks an app task's
snapshot nullable. The guard now filters unavailable snapshots before
matching the current task. A missing current snapshot remains unavailable,
so no component state changes occur. No emulator or Metro was started;
the failed compiler log is preserved and the native rebuild is pending.

RAN: `w-3304` compiles in 17 seconds and opens Home, but never mounts
AppIcon. Its hierarchy stays on the Home list, so this run has no AppIcon
support or switching verdict. The activity receipt shows MainActivity as
the root of its own task. The saved input log records `input tap 541 2400`,
outside the 1080x2400 device. The navigation helper accepted an intersecting
row clipped at the bottom edge, then rounded its tiny visible midpoint
outside the viewport. It now requires bounds strictly inside the viewport,
rechecks the fresh row before tapping, and records those bounds. This
strengthens the existing navigation precondition; runtime deadlines and
AppIcon assertions remain unchanged. The compiled APK can be reused because
only the runner and this status changed.

RAN: `w-c4c2` passes all eight focused AppIcon checkpoints on Pixel8/API37.
Switching preserves PID3695 and app focus, cold relaunch preserves support
and TestAlternate, restoring Primary preserves the new PID4635 and focus,
and invalid input preserves Primary while rejecting E_APP_ICON_INPUT.
Committed proof
retains exact source identities, launcher/process receipts, XML and
native-density quality-90 WebPs inspected at original resolution. The APK
SHA256 is `39ff9039bb53542fa89c168cee4ac5cc4fce3929f864b5b9aa0dec14a61952bb`.
The synthetic fixture is uninstalled after evidence, the owned emulator and
Metro are stopped, adb has no devices and the peer tree is clean. This
unit landed on `v2-beta` as `28097e9d396ac83dc168ba3172d05ccaedad7aed`,
preserving incoming Crypto work. Four inspected captures were shared with
Nate. Broad Android API acceptance and Expo
pixel fidelity remain open. Next: resume the existing full system suite on
the updated beta tree. Delivery CI and canary content verification remain
with one-ci (s15186).

## Baseline and boundary

- **RAN:** `packages/one/src/platform/compose.android.tsx` and `packages/one/android/src/main/java/dev/onejs/onenative/OneNativeComposeNodeView.kt` expose Column, Row, Box, Text, Icon, Button, Switch, TextField, Slider, AlertDialog, Dialog, and ProgressIndicator. The existing `one-native-conformance.android.ts` drives the initial controls on an emulator.
- **RAN:** Peach already registers the upstream `@expo/ui/jetpack-compose` native view names in `packages/peach-compat/src/stubs/native-seams/expo-ui-jetpack-compose.tsx`, with two paired Android library cases. The Expo UI coverage lane owns that package's iOS work. This lane owns Android gaps and the Android proof.
- One iOS API implementation and Swift/Kotlin import belong to their own lanes. Android API counterparts follow their public contracts as they land.

## Order

1. Extend the existing Compose node transport with the next useful Material 3 controls: Checkbox, RadioButton, chips and selection groups, then common layout and presentation components. Reuse the existing controlled event protocol and native composition owner; add no second host path.
2. For each control, compare One's exposed props and behavior with the corresponding Android `@expo/ui/jetpack-compose` component, run the One app on an emulator, and prove initial state, interaction, controlled rejection/acceptance, disabled behavior, and remount where relevant. Keep visual changes on a review branch with paired before/after evidence.
3. Run Peach's paired Expo UI Jetpack cases on Android, record the first reproducible divergence, fix the native seam or engine owner, and rerun the same checkpoint. Coordinate file ownership with the Expo UI coverage lane.
4. Follow each new One iOS service API with its Android implementation when the platform offers it. Record Android-specific permission and lifecycle behavior in the One native docs and prove it on the emulator.

## Coverage map at lane start

**RAN:** The installed Expo UI `jetpack-compose/index.ts` exports host/layout, text/icon/image, button variants, cards, chips, selection controls, feedback, motion, overlays, navigation, text input, search, carousel, and date/time components. One has the 12 nodes above. Its first missing high-use components are Checkbox, RadioButton, chips, and cards. This lane starts with Checkbox because it fits the existing controlled boolean transport and native Material 3 theme.

**RAN:** Peach's Android native view registry supplies nearly all of those groups, including Checkbox and RadioButton. `DatePickerDialogView`, `TimePickerDialogView`, and `DateTimePickerView` explicitly throw unsupported because their Material 3 calendars, clock dial, and range interaction are missing. Those are measured Peach targets after the One controls, with the Expo UI coverage owner retaining the iOS side.

## Landed slices

- **RAN:** `eee326c7d` added Checkbox and RadioButton with Android emulator selection proof; `e4b5aa1df` repaired home navigation in the conformance runner.
- **RAN:** `e61788b7e` added Card variants; `9b718245b` added horizontal and vertical dividers. Both have Pixel 8 runtime captures.
- **RAN:** `4a2a3fffc` added FilterChip and `beef6dca0` added AssistChip, InputChip, and SuggestionChip. The focused Android Compose conformance suite now drives selection, cards, dividers, and chips, with emulator screenshots for each state.
- **RAN:** Badge and BadgedBox render a dot, circular count, wide count, explicit overlay, and default overlay on a Pixel 8 emulator. The focused `--suite compose-badges` checks text and geometry from a fresh app launch.
- **RAN:** ListItem renders headline, overline, supporting, leading, and trailing slots with color and elevation overrides. The focused `--suite compose-list-items` passed on the Pixel 8 emulator and captured both a full and a minimal item.
- **RAN:** FlowRow wraps five fixed-width children 2–2–1 with horizontal and vertical spacing on a Pixel 8 emulator. The focused `--suite compose-flow-row` asserted row positions and passed after a full Android APK build, One package build, Compose tests, and fixture typecheck on pro-64.
- **RAN:** `Spacer` and positive `composeStyle.weight` on direct Row and Column children passed the focused `--suite compose-flow-row` on a Pixel 4 API 31 emulator. UIAutomator omits the empty Spacer node, so the proof asserts the left/top text at the container starts and the right/bottom text more than halfway across the remaining width/height; without weight those endpoints sit adjacent. The One build, 26 Compose tests, fixture typecheck, and 292-task Android APK build passed on pro-128. The proof stopped its emulator and Metro process.
- **RAN:** IconButton, FilledIconButton, FilledTonalIconButton, and OutlinedIconButton render Material 3 variants on a Pixel 8 emulator. The focused `--suite compose-icon-buttons` verified all variants mounted, a filled button click reached JS, and a disabled button did not. Custom enabled and disabled colors appear in the captured screen. The One package build, Compose tests, fixture typecheck, and Android APK build passed on pro-64.
- **RAN:** FilledTonalButton and ElevatedButton render through `One.Android.Button` on a Pixel 8 emulator. The focused `--suite compose-icon-buttons` verified both variants mounted and that each tap incremented the JS counter; the disabled icon button left that counter unchanged. The One package build, Compose tests, fixture typecheck, and Android APK build passed on pro-64.
- **RAN:** Small, standard, large, and extended Material 3 floating action buttons render with icon and text slots on a Pixel 8 emulator. The focused `--suite compose-icon-buttons` verified each variant mounted, four taps reached JS, the extended label collapsed, and a disabled icon button did not emit a click. The One package build, Compose tests, fixture typecheck, and Android APK build passed on pro-64. For this proof only, the unrelated Kotlin source import and GPU routes were omitted from Metro's route graph because they currently fail module resolution; both routes were restored after the proof.
- **RAN:** Material 3 `1.5.0-alpha17`, matching the installed Expo UI Android dependency, builds in One's Android APK. `ToggleButton`, `IconToggleButton`, `FilledIconToggleButton`, and `OutlinedIconToggleButton` passed a Pixel 4 API 31 emulator run: rejected and accepted controlled changes, icon variant callbacks, custom checked colors, and disabled negative control. The One build, 26 Compose tests, fixture typecheck, and 292-task Android APK build passed. The unrelated Kotlin source import and GPU routes were omitted only from Metro's proof graph and restored afterward. The Pixel 8 API 37 AVD saturated pro-128 and did not reach Home; the smaller API 31 AVD held above 50% CPU idle during the successful proof.
- **RAN:** With Material 3 `1.5.0-alpha17`, the focused Badge and ListItem suites passed again on the API 31 emulator. A later boot sampled 6.69% CPU idle; the proof guard compared an awk string lexically and failed to exit. The local proof script now converts the idle sample to a number, and a 6.69% input exits nonzero. Both emulator runs stopped their own emulator and Metro processes.
- **RAN:** Material 3 expressive `LoadingIndicator` and `ContainedLoadingIndicator` render indeterminate and determinate shapes with color overrides on a Pixel 4 API 31 emulator. The focused `--suite compose-loading` mounted all four variants and advanced determinate progress from 0.25 to 0.75; before and after screenshots show the two determinate shapes changed. The One build, 26 Compose tests, fixture typecheck, and 292-task Android APK build passed on pro-128. The proof stopped its emulator and Metro process.
- **RAN:** Material 3 `Surface` renders plain, clickable, selectable, and toggleable variants on a Pixel 4 API 31 emulator. The focused `--suite compose-surface` verified native checked semantics for selectable and toggleable states, rejected then accepted a controlled toggle, counted a click, and confirmed the disabled surface emitted no click. Color, border, elevation, and corner radius appeared in the capture. The One build, 26 Compose tests, fixture typecheck, and 292-task Android APK build passed on pro-128. The proof stopped its emulator and Metro process. Expo UI's advanced `Shape` values remain a separate coverage gap.
- **RAN:** Material 3 regular and wavy linear/circular progress indicators render on a Pixel 8 Android emulator. The focused `--suite compose-progress` mounted four determinate variants and two wavy indeterminate variants; a tap advanced the determinate indicators from 0.25 to 0.75. Paired screenshots show the native bars and arcs changing, plus custom linear color and track color. The One build, 26 Compose tests, fixture typecheck, and 292-task Android APK build passed on studio-64. The proof stopped its emulator and Metro process.
- **RAN:** Progress indicators now carry Expo UI stroke caps, track gaps, circular stroke width, determinate stop indicator settings, and wavy amplitude, wavelength, speed, and linear stop size. On a Pixel 4 API 31 emulator the focused `--suite compose-progress` mounted tuned determinate and indeterminate variants and advanced progress from 0.25 to 0.75. The custom red stop dot appears in 121 screenshot pixels; the earlier default Pixel 8 capture had none. These captures use different Android versions, so their overall palette is not a pixel baseline. The One build, 26 Compose tests, fixture typecheck, and 292-task APK build passed on pro-128. The proof stopped its emulator and Metro process.
- **RAN:** Material 3 single-choice and multi-choice segmented rows render on a Pixel 8 Android emulator. The focused `--suite compose-segmented` verified native checked states, selection changes, controlled rejection and acceptance, and disabled taps. Paired screenshots show the first-to-second single selection and a newly checked multi segment. The One build, 26 Compose tests, fixture typecheck, and 292-task Android APK build passed on studio-64; the stricter runtime suite passed after the fixture root received `flex: 1`. The proof stopped its emulator and Metro process.
- **RAN:** SegmentedButton now exposes all 12 Expo UI active, inactive, and disabled border, content, and container colors. A fresh Pixel 8 `--suite compose-segmented` run passed all six runtime checkpoints after a 292-task Android APK build, and the before/after capture shows custom colors on selected, unselected, and disabled segments. The proof stopped its emulator and Metro process.
- **RAN:** Switch now exposes all 16 Expo UI checked, unchecked, disabled checked, and disabled unchecked thumb, track, border, and icon colors. A Pixel 4 API 31 emulator showed custom pink, green, and amber switch states; the focused probe also passed controlled rejection, acceptance, and disabled tap checks. The One build, 26 Compose tests, fixture typecheck, and 292-task Android APK build passed on pro-128. The proof stopped its emulator and Metro process.
- **RAN:** Slider now exposes Expo UI lower and upper drag limits plus thumb, track, and tick colors. A Pixel 8 API 37 emulator dragged across a full 0–100 track and stopped at 80 and 20; paired captures show the custom colors and endpoints. The One build, 26 Compose tests, fixture typecheck, and 292-task Android APK build passed on pro-128; the runtime proof ran on studio-64 and stopped its emulator and Metro process. Custom thumb and track slots, vertical Slider, and finish callbacks remain separate coverage gaps.
- **RAN:** `b1326e261` added Material 3 `DatePicker`, `TimePicker`, `DatePickerDialog`, and `TimePickerDialog` on the controlled number transport (utc day millis for dates, minutes since local midnight for times; JS keeps the untouched part of the `Date`). The focused `--suite compose-pickers` passed 15 checkpoints on a Pixel 8 API 37 emulator: rejected day rolls back natively, a day outside `minimumDate` emits nothing, an accepted day keeps its time of day, a dial hour change, date dialog confirm, reopen starts from `selection`, cancel dismisses, time dialog confirm. Material's `TimeInput` autofocuses its hour field and raises the keyboard; the fixture shows one inline picker at a time for that reason.
- **RAN:** Metro could not bundle the native-features app on Android: `.kt` was missing from `sourceExts` and neither Metro transformer rendered Kotlin source imports. `74b44c130` shares the Vite Kotlin renderer with both transformers, so the Kotlin source route no longer has to be dropped from Metro's proof graph. `9669e6825` makes prebuild rebuild `app/src/main/java/one/source`, which kept stale ProtectedStore evidence copies after `62e0f7a4d`.
- **RAN:** The longer `--suite compose` sometimes sends a chip tap to a Home route behind the Compose screen. A React view touch override and a Compose root gesture handler both failed to resolve this reliably, so neither remains in the Badge change. The original suite still reports the failure.
- **INFERRED:** The Expo UI coverage owner is working through iOS captures and reserves the later Peach Compose proof. This lane continues One Android Compose while that work is active, then takes measured Peach Android gaps without changing their iOS files.

## Acceptance for each objective slice

- The exact Android source and public JS boundary agree; senders and receivers are updated together.
- A real Android emulator shows the new behavior and a negative control that would fail without the change.
- The narrowest type/build check passes. Sync with `origin/v2-beta`, commit narrowly, and push `HEAD:v2-beta` without publishing a package.

## Beta recovery proposal: Android system services (2026-10-04)

Status: proposal only. No native change lands before the assigned proposal
disposition (first-layer p61184, then substantive p60786, integration by
manager p61056). Scope is exactly the 12 existing services below; no Air32,
no main/stable, no new public API, no unrelated service work.

Scope: Device, KeepAwake, ScreenOrientation, ScreenCapture, Share, Print,
QuickActions, AppIcon, Location, MapServices, LocalAuthentication,
ProtectedStore. Lane branch `tm/beta-android-system`, base `origin/v2-beta`;
`nitro.json` registration stays in this branch for manager-serialized
integration. Task `t-muu8ms26-161y0`.

### Ground truth read (RAN)

- All 12 specs under `packages/one/src/platform/specs/One*.nitro.ts`
  (iOS-only `HybridObject<{ ios: 'swift' }>`), all 12 `index.native.ts`
  wrappers (iOS guard + `NitroModules.createHybridObject`), all 12
  `unavailable.ts` contracts, and all 12 `index.android.ts` stubs (each is
  one line: `export * from './unavailable'`).
- All 12 Swift implementations under `packages/one/ios/Nitro/HybridOne*.swift`
  (1695 lines total), including error codes, plus `OneQuickActionsLaunch.mm`.
- Landed Kotlin patterns: `HybridOneBrowser.kt` (activity via
  `NitroModules.applicationContext?.currentActivity`, `ActivityEventListener`,
  `LifecycleEventListener`, `startActivityForResult`), `HybridOneSecureStore.kt`
  (AndroidKeyStore AES-256-GCM + SharedPreferences, `Promise.async`,
  `OneNativeError(code, message)`), `HybridOneNotifications.kt`
  (`PermissionListener`, main-thread handler). `OneNativeError` prints as
  exactly `<code>: <message>`; JS `rethrowNativeError` restores `code`.
- `packages/one/nitro.json` (12 services iOS-only), library
  `AndroidManifest.xml` (only `ACCESS_NETWORK_STATE`, sensor, Custom Tabs
  queries, FileProvider), `build.gradle` (minSdk 23, compile/target 35,
  no biometric/maps/push deps unconditionally), `nativeError.ts`.
- Conventions `plans/one-native-api-conventions.md` section 6: the library
  manifest declares no permission except Android normal (install-time);
  dangerous permissions are stamped into the app manifest from `native.app`.
  Prebuild stamping precedent: `prebuildWithoutExpo.ts` stamps CAMERA,
  RECORD_AUDIO, and notification permissions/receivers from `native.app` keys.
  `native.app.location.whenInUse` exists but stamps iOS only today.
- `platform-support.mdx`, the 12 doc pages under `apps/onestack.dev/data/native/`
  (each states Android unavailability today), drift suite
  `packages/one/tests/nativeDocs.test.ts`, SSR suite
  `packages/one/tests/unavailableServices.test.ts` +
  `fixtures/one-unavailable-services.ts` (62+ checks against the web/SSR
  entry, untouched by Android work), and the adb conformance runner
  `tests/native-features/scripts/one-native-conformance.android.ts`.
- SDK stubs in `~/Library/Android/sdk/platforms`: ShortcutManager,
  PrintManager, Geocoder, LocationManager, BiometricManager, and PixelCopy
  exist in android-31 through android-37.0. `DETECT_SCREEN_CAPTURE`,
  `DETECT_SCREEN_RECORDING`, and `Activity.registerScreenCaptureCallback`
  are absent in android-31 and present in android-36+, so ScreenCapture
  state detection needs a runtime API gate above minSdk 23.
- Fixtures already exist for all 12 services under
  `tests/native-features/fixtures/one-native-*.tsx`; no new fixture file is
  proposed, only Android legs driving them.

### WIP e43a2b4dd assessment (r58412, registration only)

Reusable direction, not landable as is:

- Reusable: per-service `nitro.json` android entries
  (`HybridOne<Name>`, kotlin) for exactly the 12 in-scope services;
  spec widening to `{ ios: 'swift'; android: 'kotlin' }`; guard removal in
  `index.native.ts`; `androidx.biometric:biometric:1.1.0` dependency.
- Missing: all 12 Kotlin implementations, nitrogen regeneration
  (`packages/one/nitrogen/generated` untouched), Location prebuild stamping
  (dangerous permissions cannot ride the library manifest), QuickActions
  launch-intent capture, AppIcon alias mechanism, fixture legs, docs and
  `platform-support.mdx` updates, and every runtime proof.
- Wrong: `nitro.json` is fully reformatted (382 changed lines for 12
  entries); the implementation redoes it as 12 minimal hunks to avoid
  clobbering the peer media lane's entries at manager integration. And
  guard removal alone changes nothing on Android: Metro resolves
  `index.android.ts` (unavailable) ahead of `index.native.ts`, so each
  service's `index.android.ts` must be deleted (the landed Browser pattern:
  no `index.android.ts`, `index.native.ts` serves both platforms). No test
  references `index.android.ts`, so deletion breaks no suite.
- Unverified: whether `DETECT_SCREEN_CAPTURE` / `DETECT_SCREEN_RECORDING`
  are normal (library manifest allowed) or require prebuild stamping; verify
  via `PackageManager.getPermissionInfo().protectionLevel` on the build host
  before choosing. The exact introduction API level (32-36) is also pinned
  there; below it `getState` returns `unspecified` with silent listeners.

### Shared implementation plan

Per service, in this order: spec widening, `bun run nitrogen` in
`packages/one`, minimal `nitro.json` android hunk, one
`HybridOne<Name>.kt` under `packages/one/android/src/main/java/com/margelo/nitro/one/`,
delete `index.android.ts`, remove the iOS guard in `index.native.ts`
(keeping every validation call and error string byte-identical), fixture
leg, doc page + `platform-support.mdx` row, drift suite green, SSR suite
green. Compile evidence is a real Gradle/Kotlin build of the library plus
the APK assembly the conformance leg installs, never the TS registration.

Error-code rule: mirror the Swift `E_<NAMESPACE>_<REASON>` codes below so
callers branch on `code` identically on both platforms. User refusal always
resolves (conventions table), never rejects.

Prebuild additions (all behind existing `native.app` shapes where one
exists): stamp `ACCESS_COARSE_LOCATION` + `ACCESS_FINE_LOCATION` from
`app.location`, and `ACCESS_BACKGROUND_LOCATION` when
`app.location.background` is set. No other new permission is proposed;
biometric and screen-detect permissions ride the library manifest only if
verified normal, else they join the same stamping with reviewer approval.

### Per-service plan

Device (`getInfo`, `getLocalizationInfo`). Swift: UIDevice/Locale/TimeZone,
`isSimulator` via targetEnvironment, `vendorIdentifier` vendor-scoped.
Android: `Build.MODEL`, `Build.VERSION.RELEASE`, `Locale.getDefault`,
`TimeZone.getDefault`, `isSimulator` from `Build.FINGERPRINT` emulator
markers, vendor identifier from `Settings.Secure.ANDROID_ID` (documented as
app-signing-key scoped, not a hardware id). Baseline: empty strings/zero
offset today. Negative: emulator reports `isSimulator true` while a
userdebug guid check stays absent; `ANDROID_ID` differs per signing key, no
hardware id is claimed.

KeepAwake (`isEnabled`, `setEnabled`). Swift: `isIdleTimerDisabled`.
Android: `FLAG_KEEP_SCREEN_ON` on the foreground activity window, main
thread, same TS boolean assertion. Baseline: always `false`, set resolves
without effect. Negative: flag cleared on activity recreation is re-applied
from held state and `isEnabled` still reports true; backgrounded app rejects
or reports honestly, never claims the flag while no activity exists.

ScreenOrientation (`getOrientation`, `lock`, `unlock`, `addChangeListener`).
Swift: scene geometry + `requestGeometryUpdate`, errors
`E_SCREEN_ORIENTATION_{SCENE,UNSUPPORTED,TIMEOUT}`, 10s timeout, change
listeners on real rotation only. Android: `activity.requestedOrientation`
mapping portrait/portraitUpsideDown/landscapeLeft/landscapeRight/landscape,
current value from `Display.rotation` + configuration, listener via
`OrientationEventListener` filtered to the five values. No manifest change.
Baseline: always `unknown`, locks resolve `unknown`. Negatives: lock to an
orientation the manifest forbids rejects `E_SCREEN_ORIENTATION_UNSUPPORTED`;
listener remover stops delivery; rotation without lock still notifies.

ScreenCapture (`getState`, `captureWindow`, `captureView`,
`addStateListener`, `addScreenshotListener`). Swift: trait capture state,
window/view PNG render to caches with uri/width/height/size, errors
`E_SCREEN_CAPTURE_{SCENE,INPUT,VIEW,RENDER,ENCODE,FILE}`, screenshot
notification with timestamp. Android: state via
`registerScreenCaptureCallback` gated above its introduction level (else
`unspecified`); capture via PixelCopy (API 26+, else honest rejection)
writing PNG under the app cache through the existing FileProvider paths;
screenshot signal via MediaStore content observer; `captureView` resolves
the react tag to a mounted view (no existing resolver in the tree; unknown
or unmounted tag rejects `E_SCREEN_CAPTURE_VIEW`). Baselines: `unspecified`
state, captures reject `needs an iOS or Android build`. Negatives: unknown
view tag, zero-area view, below-gate API level.

Share (`share`). Swift: non-empty items, text/url/file validation, busy and
presentation guards, `{ completed, activityType }`, errors
`E_SHARE_{ITEMS,URL,FILE,BUSY,PRESENTATION,FAILED}`. Android:
`ACTION_SEND`/`ACTION_SEND_MULTIPLE` chooser with FileProvider URIs for
files, a chooser IntentSender recording the chosen component as
`activityType`; `completed` is true only when a target was chosen, false on
dismiss (cancellation resolves, never rejects). Baseline: rejects
`needs an iOS or Android build`. Negatives: empty items, blank text,
non-absolute URL, missing file, second share while one is open.

Print (`isAvailable`, `printPdf`). Swift: `isPrintingAvailable`, local
file:// PDF with pages, busy/presentation guards, errors
`E_PRINT_{BUSY,INPUT,UNAVAILABLE,URI,FILE,PDF,PRESENTATION,FAILED}`.
Android: `PrintManager` + a `PrintDocumentAdapter` rasterizing the PDF via
platform `PdfRenderer`; `isAvailable` false when no print service handles
the job. Baseline: `isAvailable false`, print rejects. Negatives: missing
file, non-PDF bytes, empty jobName, print while another job is pending.

QuickActions (`setItems`, `getItems`, `getInitialAction`,
`clearInitialAction`, `addListener`). Swift: shortcut items with unique
non-empty id/title, coordinator fed by `OneQuickActionsLaunch.mm` swizzle,
`E_QUICK_ACTIONS_INPUT`. Android: dynamic `ShortcutManager` shortcuts whose
intents relaunch the activity with the action id; Kotlin
`ActivityEventListener.onNewIntent` + launch-intent harvest feed an
in-hybrid coordinator mirroring the Swift one (cold start sets the initial
action, warm start notifies listeners). No manifest change. Baselines:
`getItems []`, `getInitialAction null`, set resolves without effect.
Negatives: duplicate/blank ids rejected in TS identically on both
platforms; cold start via `adb shell cmd shortcut` reports the id once,
then `clearInitialAction` nulls it; warm tap notifies listeners, not the
initial slot.

AppIcon (`isSupported`, `getCurrentName`, `setIcon`). Swift:
`supportsAlternateIcons`, Info.plist lookup, active/busy guards, errors
`E_APP_ICON_{INPUT,UNAVAILABLE,INACTIVE,BUSY,CHANGE}`. Android:
`PackageManager.setComponentEnabledSetting` over manifest `activity-alias`
entries; `isSupported` true only when at least one alias exists;
`getCurrentName` from the enabled alias; unknown name rejects
`E_APP_ICON_INPUT`, no aliases rejects `E_APP_ICON_UNAVAILABLE`. The alias
set lives in the app manifest. Open decision for reviewers: stamp aliases
from a new `native.app.android.alternateIcons` mirroring
`ios.alternateIcons`, or document manual manifest aliases with
`isSupported false` otherwise. No stamping is implemented before that call.
Baselines: `isSupported false`, `setIcon` resolves without effect.
Negative: unknown name rejects; concurrent set rejects busy.

Location (`getPermissionStatus`, `requestWhenInUsePermission`,
`getCurrentPosition`, `watchPosition`, `geocodeAddress`, `reverseGeocode`).
Swift: CoreLocation statuses, manifest usage guard
(`E_LOCATION_MANIFEST`), active-app guard, 30s recent-position rule,
`E_LOCATION_{PERMISSION,BACKGROUND,UNAVAILABLE,GEOCODE}`, empty geocode on
no result, `-1`/`0` unavailable fields. Android: platform
`LocationManager` only (no Play Fused provider, per lane constraint) with
`PermissionListener` runtime prompt mirroring the Notifications pattern;
status maps granted/denied/notDetermined onto the five spec values
(`always` only with background grant); geocoding via platform `Geocoder`
with `isPresent` gate; background watch requires `app.location.background`
else `E_LOCATION_MANIFEST`. Baselines: status `denied`, position rejects,
geocodes return `[]`, watch remover is inert. Negatives: denied permission,
revoked mid-watch (listeners get `E_LOCATION_PERMISSION`), invalid
coordinate, blank address, background watch without the manifest flag.

MapServices (`search`, `autocomplete`, `resolveSuggestion`, `directions`).
Swift: MapKit search/completer/directions, `E_MAP_{INPUT,SEARCH,
AUTOCOMPLETE,CANCELED,TIMEOUT,DIRECTIONS}`, radius 100-50000m, superseded
autocomplete rejects its predecessor. Android has no platform autocomplete
or directions service (Play SDK is out of lane scope). Proposed honest
split: `search` via platform `Geocoder.getFromLocationName` bounded by the
same radius validation; `autocomplete`, `resolveSuggestion`, and
`directions` keep the existing per-method unavailable contract (empty
results where the contract returns `[]`, rejection with
`needs an iOS or Android build` where it rejects), implemented in Kotlin so
the failure is explicit, never fake. Open decision for reviewers: accept
this per-method split, or hold all of MapServices unavailable on Android.
Baselines: `search`/`autocomplete` `[]`, resolve/directions reject.
Negatives: blank query, out-of-range radius, unknown suggestion id,
coordinates beyond +-90/180.

LocalAuthentication (`canEvaluatePolicy`, `evaluatePolicy`). Swift:
biometrics-only policy, `E_LOCAL_AUTH_{REASON,MANIFEST,LOCKOUT,
NOT_ENROLLED,PASSCODE_NOT_SET,FAILED}`, cancellation resolves false.
Android: `androidx.biometric` prompt; `canEvaluatePolicy` from
`BiometricManager.canAuthenticate`; reason required; cancellation resolves
false. `LocalBiometryType` is iOS-flavored; proposed mapping from system
features (fingerprint to `touchID`, face to `faceID`, none enrolled to
`none`) is documented on the doc page. Open decision for reviewers if they
prefer `none` whenever the kind cannot be proven. Baseline: unavailable
with `biometryType none`, evaluate rejects. Negatives: blank reason,
no enrolled biometrics, user cancel resolves false, lockout rejects.

ProtectedStore (`createItem`, `getItem`, `updateItem`, `deleteItem`). Swift:
keychain access control fixed at create, policy label check
(`E_PROTECTED_STORE_POLICY`), duplicate/missing/cancelled/auth/input/
manifest failures, `getItem` null when missing. Android: per-key
AndroidKeyStore AES-GCM keys with `setUserAuthenticationRequired(true)`
(`userPresence` allows device credential, `biometryCurrentSet` is
biometric-only with invalidation on new enrollment), ciphertext + policy
label in private preferences following the `HybridOneSecureStore.kt`
structure, every read/change gated by a BiometricPrompt carrying `reason`.
`getItem` returns null when the key is missing; policy mismatch rejects;
cancellation rejects `E_PROTECTED_STORE_CANCELLED`. Baseline: every method
rejects. Negatives: duplicate create, missing-key update, wrong-policy
read, blank key/reason, cancel mid-prompt, enrollment change invalidating a
`biometryCurrentSet` key.

### Runtime proof plan

Proof host is a claimed Android 37 emulator via the shared builder
(`bun heavy`, existing AVD claim, no duplicate builders), coordinated with
the manager against the media lane. Each service leg extends the existing
conformance runner with a focused suite driving its existing fixture:
baseline run first (unavailable contract observed), then the repaired run.
Every leg keeps a negative control that fails if the Kotlin is stubbed
(denied/revoked permission, cancelled prompt, unknown id/tag, duplicate
create, missing file, busy re-entry, activity recreation). Compile evidence
is the real `./gradlew` library + APK build log; TS registration alone
proves nothing. Drift (`nativeDocs.test.ts`) and SSR
(`unavailableServices.test.ts`) suites stay green; doc pages and
`platform-support.mdx` are updated in the same change.

### Open decisions (need reviewer call before implementation)

1. AppIcon Android alias source: new `native.app.android.alternateIcons`
   stamping vs documented manual manifest aliases.
2. MapServices Android split: Geocoder-backed `search` with per-method
   unavailable autocomplete/resolve/directions vs holding the whole service.
3. LocalAuthentication `biometryType` mapping: feature-derived kind vs
   `none` unless provable.
4. ScreenCapture detect-permission placement: library manifest if verified
   normal, else prebuild stamping (new `native.app` key).
5. Share `completed` semantics: true-on-target-chosen (proposed) vs always
   false on Android.

## Beta recovery implementation disposition (2026-10-05)

Reviewer p60786 approved TEN services for bounded implementation at
proposal `669de43ea` with all 13 first-layer corrections folded first;
no native/runtime approval yet. Exact One-only dossier
`/Users/n8/.team-machine/handoffs/one-beta-recovery/public-review-controls/system-approval.md`,
full first-layer
`/Users/n8/.team-machine/handoffs/one-beta-recovery/first-layer-verdicts.txt`.
Task `t-muu8ms26-161y0` (in progress, author p61888).

Approved ten: Device, KeepAwake, ScreenOrientation, Share, Print,
QuickActions, AppIcon, Location, MapServices, LocalAuthentication.
HELD with no native writes: ScreenCapture (corrected design below,
`t-muusi2pr-1hgr0`) and ProtectedStore (research below,
`t-muusi2v1-1hh50`). Their `index.android.ts`, specs, and nitro
registrations stay untouched. Reviewer decisions: AppIcon manual
manifest aliases with `isSupported false` otherwise (no new
`native.app` surface); MapServices Geocoder search + per-method
unavailable; biometry mapped only when a single kind is provable else
`none`; Share `completed` true-on-target-chosen with a docs note.

### The 13 corrections as implementation preconditions

1. MapServices keeps `index.android.ts` as a per-method split: `search`
   re-exported from `./index.native` (guard removed), `autocomplete`,
   `resolveSuggestion`, `directions` from `./unavailable`. The Kotlin
   class implements the full generated spec; the three unsupported
   methods reject as unreachable-behind-TS-routing and are never called
   on Android. No Kotlin unavailable stubs.
2. QuickActions harvests on three legs: cold-start launch intent (read
   once at hybrid init), `onNewIntent` for warm taps, and
   `onHostResume` re-read of the current intent (Notifications:122-124
   precedent) for standard-launchMode warm taps. Cold sets the initial
   slot; warm notifies listeners only.
3. `captureView` resolver pin (held-service precondition, kept): reuse
   the UIManagerHelper tag precedent, reject unknown/unmounted tags
   with `E_SCREEN_CAPTURE_VIEW`.
4. Location: five statuses map as notDetermined (never asked),
   whenInUse (foreground grant, no background grant), always (background
   grant held), denied (denied or services off); restricted is
   unreachable on Android (no platform API distinguishes it) and never
   returned. Absent bearing/speed map to `-1` when `hasBearing`/
   `hasSpeed` are false (Android reports 0.0, iOS -1); absent altitude
   maps 0.0; absent vertical accuracy maps -1. `getCurrentPosition`
   resolves the last-known fix when fresh (<30s, accuracy >= 0, same
   rule as Swift) else requests one fix; fix timeout rejects
   `E_LOCATION_UNAVAILABLE`. Background watch requires
   `app.location.background` (else `E_LOCATION_MANIFEST`, mirroring the
   Swift background-modes guard) and the background grant; it runs
   under a location-type foreground service with a persistent
   notification while a background listener is registered, stopped
   when the last one is removed. Stamped from existing config:
   `ACCESS_COARSE_LOCATION` + `ACCESS_FINE_LOCATION` from
   `app.location`, `ACCESS_BACKGROUND_LOCATION` when
   `app.location.background` is set. Library manifest gains the normal
   `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_LOCATION` only.
5. Device `interfaceIdiom`: `tv` when UiModeManager reports
   television, `pad` when smallest width >= 600dp, else `phone`.
   carPlay/mac/vision are unreachable on Android.
6. KeepAwake holds desired state in memory: `isEnabled` resolves it on
   the main thread with no activity required (mirrors the Swift global
   read); `setEnabled` records it, applies `FLAG_KEEP_SCREEN_ON` to
   the current activity window when one exists, and re-applies on
   resume/recreation. No rejection path; the negative control is
   recreation re-application verified via window flags.
7. Orientation: current value from `Display.rotation` plus natural
   orientation; locks map portrait/`SCREEN_ORIENTATION_PORTRAIT`,
   portraitUpsideDown/`REVERSE_PORTRAIT`,
   landscapeLeft/`REVERSE_LANDSCAPE`,
   landscapeRight/`LANDSCAPE`, landscape/`SENSOR_LANDSCAPE`. The exact
   left/right pairing is verified on the emulator proof and recorded
   here. Manifest screenOrientation is read via PackageManager and
   defines unlock restoration (`UNSPECIFIED` returns to manifest
   behavior); runtime locks override the manifest on Android, so a
   manifest conflict never fakes `E_SCREEN_ORIENTATION_UNSUPPORTED`.
   That code fires only on a non-rotatable display (television type).
   A 10s verify window mirrors the Swift timeout
   (`E_SCREEN_ORIENTATION_TIMEOUT`); backgrounded calls reject
   `E_SCREEN_ORIENTATION_SCENE`. Listeners run on real rotation only
   via OrientationEventListener filtered to the five values; remover
   stops delivery.
8. MapServices.search validates exactly like Swift (blank query,
   non-finite or out-of-range center, radius outside 100-50000 reject
   `E_MAP_INPUT`); center+radius become a Geocoder bbox
   (dLat = r/111320, dLng = r/(111320*cos(lat)), clamped +-90,
   wrapped +-180, maxResults 10). `Geocoder.isPresent()` false and genuine
   empty/null results resolve `[]`. Search exceptions reject `E_MAP_SEARCH`
   on the main handler. The earlier IO-empty premise was incorrect: Swift
   rejects search failures except its explicit placemark-not-found case.
9. Biometry: exactly one of fingerprint/face hardware features present
   plus `canAuthenticate(BIOMETRIC_STRONG) == SUCCESS` reports
   `touchID`/`faceID`; zero or ambiguous (both) kinds report `none`.
   `canEvaluatePolicy` maps BiometricManager result codes onto
   `errorCode` when unavailable (no hardware, unavailable,
   none-enrolled, lockout). `evaluatePolicy` requires a non-blank
   reason (`E_LOCAL_AUTH_REASON`); user/system cancel and negative
   button resolve false; lockout/no-biometrics/no-credential map to
   `E_LOCAL_AUTH_{LOCKOUT,NOT_ENROLLED,PASSCODE_NOT_SET}`;
   everything else rejects `E_LOCAL_AUTH_FAILED`. No manifest code
   exists on Android (USE_BIOMETRIC is normal, library manifest).
10. ProtectedStore held; research below, no weakening.
11. QuickActions items beyond `maxShortcutCountPerActivity` reject
    `E_QUICK_ACTIONS_INPUT`; never silently trim.
12. Print rasterizes each PDF page via platform PdfRenderer at the
    job PrintAttributes resolution (default 300dpi):
    bitmap = mediaSize points * dpi/72. `isAvailable` is false when no
    print service handles the job.
13. ScreenCapture IMPLEMENTED under p60786 bounded approval frozen
    2026-10-05T07:41Z (verdict public-review-controls/
    screen-correction-approval.md): unix receipt timestamp,
    VISIBLE/NOT_VISIBLE initial+callback mapping, sub-35/sub-34
    silent gates, idempotent removers, existing E_SCREEN_CAPTURE_RENDER
    for sub-26, real activity vs process-UID recording lifetimes.

Error-code rule stands: mirror the Swift `E_*` codes so callers
branch identically; user refusal resolves, never rejects.

### Corrected ScreenCapture design (APPROVED p60786, implemented e37b9a243)

F1 P2: `Activity.registerScreenCaptureCallback` reports screenshot
notifications only (API 34, `onScreenCaptured()` carries no value),
never ongoing recording state. Recording state comes only from the
API 35 `WindowManager.addScreenRecordingCallback` (initial int state
plus subsequent states, needs `DETECT_SCREEN_RECORDING`). Both
detect permissions are normal install-time, so both ride the library
manifest. Corrected mapping: `getState`/`addStateListener` read the
WindowManager API 35 state plus its listener/remover, `unspecified`
below API 35; screenshot notification uses the API 34 Activity
callback; capture stays PixelCopy (API 26+, honest rejection below)
through the existing FileProvider paths with the UIManagerHelper
resolver and same-window/unknown-tag checks. Registration follows
owned activity lifetime (unregister/re-register on pause/resume).
Proof controls (when gated): independent screenshot vs recording
start/stop, initial-state and remover checks; ADB screenshots are not
a positive test for the API 34 callback. Disposition APPROVED on
`t-muusi2pr-1hgr0`; native code written after approval only.

First-layer disposition (p61184): PASS WITH 4 CORRECTIONS + 1
PRECONDITION, folded here; still held for the p60786 gate.
(A) `onScreenCaptured()` carries no value, so the screenshot
`timestampMs` is stamped at receipt (`System.currentTimeMillis`),
mirroring the Swift receipt stamp. (B) Recording-state mapping:
`SCREEN_RECORDING_STATE_VISIBLE` to `active`, `NOT_VISIBLE` to
`inactive`, below API 35 to `unspecified` (pairs with the Swift
unspecified passthrough). (C) Below-gate silence is explicit:
state listeners below 35 and screenshot listeners below 34 never
fire and their removers are inert; prove on a sub-gate AVD by
runtime, not by reading. (D) Sub-26 capture rejection is named
`E_SCREEN_CAPTURE_UNSUPPORTED`: no existing code covers an absent
platform API, and callers need a distinct branch signal (iOS never
emits it); p60786 confirms the new code vs reuse call. (E)
Implementation precondition: cite each callback's scope
(activity-scoped screenshot callback vs WindowManager-instance
recording callback) to justify pause/resume re-registration.

### ProtectedStore research (held, for review routing)

First-layer issue 10 stands: `createItem(key,value,policy)` carries
no reason and must not prompt (Swift `SecItemAdd` does not prompt);
`get`/`update`/`delete` carry reason with per-use authentication;
policy is immutable; biometric-set change invalidates
`biometryCurrentSet` keys. Research target on `t-muusi2v1-1hh50`: a
concrete supported key/operation/lifetime design preserving those
calls — per-key AndroidKeyStore AES-GCM with
`setUserAuthenticationRequired(true)`, `userPresence` allowing device
credential, `biometryCurrentSet` biometric-only with invalidation on
new enrollment — with no cached authentication window, no plaintext
persistence, no silent rekey or data loss, and no weaker policy. Any
genuine product/security tradeoff stays gated. No native code is
written before disposition.

### Implementation order and proof

Order: Device, KeepAwake, ScreenOrientation, Share, Print,
QuickActions, AppIcon, Location (with prebuild stamping),
MapServices, LocalAuthentication (with biometric dependency). Each:
spec widening, `bun run nitrogen` in `packages/one`, minimal
`nitro.json` android hunk, one Kotlin file, `index.android.ts`
deletion (MapServices keeps its split), guard removal in
`index.native.ts` with validation and error strings byte-identical,
doc page + `platform-support.mdx` row, drift suite green, SSR suite
green. Shared `nitro.json` hunks stay minimal in this branch for
manager-serialized integration. Compile evidence is a real Gradle
library + APK build; runtime proof is a focused Android 37 emulator
suite driving the existing fixtures with baseline (unavailable
contract observed pre-change is already recorded in the proposal),
positive, negative, and lifetime controls per service.

## Beta recovery landing: Android system services (2026-10-05)

Landed on `v2-beta` as `196da0e3e` (tip; branch range from prior tip
`7c678c79b`). Contents: Android Kotlin implementations for Device,
KeepAwake, ScreenOrientation, Share, Print, QuickActions, AppIcon,
Location (with prebuild permission stamping), MapServices (Geocoder
search split, other methods keep unavailable contract),
LocalAuthentication (biometric), and ScreenCapture; spec widening to
`android: 'kotlin'`; `index.android.ts` deletions (MapServices keeps its
split); iOS-guard removals with validation and error strings unchanged;
Android conformance suites; doc pages and `platform-support.mdx` rows;
plus validation-found regenerations (stale ScreenCapture types,
COVERAGE.md snapshot, Toggle types/docs left stale by `e5cd3d60a`).

Validation (RAN): public API gate passed, no new `One.*` export and no
public signature change; `bun run generate:check`, `bun run typecheck`,
and the full `packages/one` vitest suite (1528 passed, 56 skipped) green
on the landed tree; `:one:assembleDebug` green with `one-debug.aar`,
branch Kotlin classes, and per-ABI `libOne.so` verified (Kotlin content
byte-identical to the validated pre-rebase tree; the rebase added only
the Toggle commit, a plans-only commit, and generated Toggle types/docs).
The `:app:assembleDebug` failure is the pre-existing duplicate
ProtectedStore evidence fixture, identical from v2-beta inputs, so it is
not a regression of either branch; a scoped probe APK built green with
one duplicate copy removed from the ignored generated tree.

Device runtime proof still open: no post-land Android emulator pass is
recorded on the landed tree. Still needed are the focused Android 37
emulator suites for the 11 landed services (positive, negative, and
lifetime controls per the runtime proof plan above).

## Beta recovery landing: Android media services (2026-10-05)

Landed on `v2-beta` as `41663235f` (tip; branch range from prior tip
`461f0c9f1`, rebased over the landed system services). Contents: Android
Kotlin implementations for Audio (with foreground service), PhotoLibrary
(MediaStore; collections and content edits keep the unavailable
contract), Contacts, and Calendar (events; reminders keep the
unavailable contract); spec widening to `android: 'kotlin'`;
`index.android.ts` deletions for Audio and Contacts with split contracts
for Calendar and PhotoLibrary reusing identical native/unavailable
references; iOS-guard removals; the `pickContact` null-to-undefined
contract fix; nitrogen union regen at rebase (autolinking +
`Func_void_std__string` param rename) with unrelated nitrogen whitespace
drift reverted; proof driver and runtime receipts.

Validation (RAN): public API gate passed, no new `One.*` export and no
public signature change; `bun run generate:check`, `bun run typecheck`,
and the full `packages/one` vitest suite (1529 passed, 56 skipped) green
on the landed tree; `:one:assembleDebug` green with `one-debug.aar`,
branch Kotlin classes, and per-ABI `libOne.so` verified (media Kotlin
content byte-identical to the validated pre-rebase tree; the rebase
added only the landed system services, Toggle, and the nitrogen union).
The `:app:assembleDebug` failure is the pre-existing duplicate
ProtectedStore evidence fixture, identical from v2-beta inputs, so it is
not a regression of either branch; the unmodified-tree failure was
reproduced exactly on this branch, and the scoped probe rerun is the
check for the fixture fix below.

Device runtime proof still open: branch-time emulator receipts
(contacts, calendar, photo, including limited-library and
series-split cases) are preserved under
`tests/native-features/evidence/one-native-android-media/`, but no
post-land Android emulator pass is recorded on the landed tree. Still
needed is a rerun of the media proof driver against the landed tree.

## Test APK repair: skip evidence dirs in kotlin source sweep (2026-10-05)

Landed on `v2-beta` as `62e0f7a4d`. Root cause: `generateKotlinSources`
in `packages/vxrn/src/exports/prebuildWithoutExpo.ts` swept every `.kt`
file under the app root except a fixed skip set, including the two
preserved ProtectedStore proof copies
(`protected-store-runtime/evidence/source-before-build.kt` and
`fault-source.kt`), which declare the same classes. The generated app
tree then failed `:app:compileDebugKotlin` with redeclarations,
identically on unmodified `v2-beta`. The fix adds `evidence` to the
skip set; evidence holds preserved proof sources, never app sources.
The sweep now collects only the real app sources (`Audio.kt` plus its
glue, `ControlReceiver.kt`). The protected-store harness keeps building
its own copies through its own tooling; no evidence file changed.

Validation (RAN): new `app kotlin source discovery` test fails before
(3 sources swept) and passes after (1 swept); full
`prebuildWithoutExpo` suite 57 passed; one CLI prebuild suite 11
passed; `one prebuild --platform android` plus unmodified
`:app:assembleDebug` green on studio-64 with `CCACHE_MAXSIZE=5G`,
`app-debug.apk` produced. This build ran on the tree containing both
landed Android lanes, so it doubles as the media `:app` probe check.

Device runtime proof still open: unchanged from the two landing entries
above, no post-land emulator pass recorded yet.

## Share callback investigation, 2026-10-07

RAN: beast `w-66c8` builds current beta `04b27155d` and passes all 158
Compose/documentation checks. Delivered AppIcon, runner, manifest writer and
incoming Crypto source hashes match; `bun release --into ~/contrast
--skip-build` installs 17 entries with unchanged downstream manifest/lock
bytes and matching native and JS outputs. Mac `w-6cc8` compiles the arm64
app in 6m42s (40 executed tasks, 330 up to date). The API37 sweep passes
18 checkpoints through filesystem, Device, KeepAwake and orientation,
then fails Share. Its final XML reports `Copy did not complete the share
activity: {"completed":false}`. Android's log records system Copy and
chooser result -1. The emulator and Metro cleanup executes.

INFERRED: `onHostResume` can set `settlePosted` before `onActivityResult`,
whose early return then discards the result. A focused runtime probe will
record the actual callback order and settlement state before choosing a
repair. The `system-share` entry reuses the full sweep's unchanged Share
assertions, including exact clipboard content, busy, file cancellation and
input errors. Full system acceptance remains open.

RAN: diagnostic APK `w-a311` survives outer cancellation and its completed
verdict is recovered by `w-4815`. The exact callback trace shows resume
at uptime 90328 scheduling settlement before chooser launch at 90333.
Settlement at 91129 runs while paused and resolves false; Copy's result
-1 arrives at 94773 with no pending promise. This proves premature
completion before user selection, rather than a missing Copy result.
The native candidate leaves resume responsible only for foreground state;
only the chooser result schedules completion. Its existing result-path
grace interval, chosen-component capture and public contract remain.
The probe's pristine source is restored, and no emulator or Metro listener
remains. The focused acceptance now also captures idle mount and the
actual Copy chooser before selection. Native repair acceptance is pending.

RAN: `w-c17d` recovers the completed repaired execution after the outer
`w-92e3` lost session projection during a fleet promotion. All six focused
Share checkpoints pass at `c4ba7378e`: idle mount, actual Copy chooser,
exact clipboard text/URL, completed=true with no activity name, file
cancellation, busy rejection and all four input guards. The changed
Android target compiles in 18s (39 executed tasks, 331 up to date).
APK SHA256: `652f08da010fc553c4ed1a48874e54aa3af4d6f6e03a8581dfcbc92be0017a5d`.
The local 17-entry release into Contrast installs identical native source;
unchanged JS sources reuse the verified current-beta build outputs.
Committed proof
includes the failing callback order, source identities, passing XML/status
records and quality-90 native-density captures inspected and shared with
Nate. Native source is restored after the diagnostic probe; the final
implementation has no probe logs. The owned fixture is removed, emulator
and Metro stop, and only preserved generated Crypto declarations remain
in the peer tree. Focused Share acceptance passes; full system/media
acceptance and paired Expo UI fidelity remain open. Next: the full system
sweep against this validated native APK and the landed runner. Delivery
CI remains assigned to live one-ci (s15186).

## Current location sweep, 2026-10-07

RAN: `w-7d42` passes 52 captured checkpoints on beta `0818352e8`,
including repaired Share, Print, Quick Actions, AppIcon and foreground
Location prompt/current/watch/geocode controls. It stops after background
watch activation because the runner's notification dump lacks the title.
The saved package state has POST_NOTIFICATIONS granted=false; Android's
log records an allowed location foreground-service start. These receipts
do not yet prove its continuing foreground state or notification content.

The focused `system-location` entry reuses the sweep's unchanged Location
assertions and saves service, permission and both redacted/full notification
dumps before the failing check. Native source and validated APK are
unchanged. [Android documents](https://developer.android.com/develop/ui/views/notifications/notification-permission)
that denied notification permission hides foreground-service notices from
the drawer while preserving Task Manager notices. A focused runtime probe
will distinguish this permission precondition from service failure and
dump redaction. Emulator/Metro and the owned fixture are removed after
the sweep. Raw checkpoints/logs remain in primary
`runtime-system-share-beta-pro64` evidence. Full system/media acceptance
and paired Expo parity remain open.

RAN: focused `w-f44b` recovers the completed probe. The service dump has
`isForeground=true foregroundId=4301 types=0x00000008` and its ongoing
`one-location` foreground notification. Notification Manager has the
fixture's importance=NONE and no active fixture record. This confirms
the ungranted visibility precondition; native startup is correct. The
candidate now requires background delivery to a fresh proof file while
notification permission remains denied, then repeats with an explicitly
verified notification grant and requires the visible drawer title plus
the matching foreground record. Both legs require exact moved coordinates
and service/notification removal on stop. Existing clocks are replaced
with those conditions; original positive notification and permission
revocation assertions remain. Native source/APK are unchanged. Repaired
focused runtime acceptance is pending.

RAN: `w-01b6` passes denied-permission background delivery with exact
coordinates and service cleanup. The granted notification record has
`Location updates active` and foreground flags. The drawer assertion
times out while the saved hierarchy remains Home after the shell expand
command. The candidate uses a top-edge swipe from the current viewport's
left quarter and asserts System UI opens before checking the title.
The gesture and window state are retained. The shared notification probe
uses this one opening path; notification deadlines and title assertions
remain unchanged. Repaired runtime, including revocation, remains pending.

RAN: `w-9c48` opens System UI and captures the actual Location foreground
notification. Both notification-denied and notification-granted legs deliver
their exact moved coordinates while backgrounded and remove the service and
notification on stop. The final permission-revocation check fails after
Android logs `am_kill` for PID 3768 with `permissions revoked`, then starts
PID 5951. The failure XML is the new process's Home screen. An old watch
callback cannot be observed after that process death.

The next candidate requires the exact permission-revocation kill record,
both grants removed and a new PID on Home before reopening the fixture.
It then requires denied status and permission errors for a new foreground
watch, current position and background watch, with no Location service or
notification left behind. The one-second sleep is removed; existing
assertion deadlines remain. Native source and the verified APK are
unchanged. Focused acceptance of this process transition remains pending.

RAN: `w-3f59` passes all 27 focused Location checks at `d9f60f49a` on
the source-pinned Pixel 8/API37 r06 fixture. The exact denied and granted
background coordinates, foreground-service identity, visible drawer title,
stop cleanup, permission-revocation kill record, changed PID and all three
denied API paths pass. Preserved proof
contains source/APK identities, every hierarchy/status receipt, service and
notification dumps, run command and quality-90 native-pixel captures.
The encoded captures and detail crops were inspected and shared with Nate.

RAN: `bun release --into ~/contrast --skip-build` installs 17 entries;
unchanged package sources reuse the verified beast current-beta outputs.
Installed Location Kotlin bytes match the worktree. Downstream manifest
and lock bytes match their immediate pre-release snapshot. No native
Location change is required. After proof, the owned fixture is uninstalled,
the emulator and Metro stop; a separate peer read shows no attached device
or listener on 8097. The source-matched APK can serve the next full system
sweep. Full system/media acceptance and paired Expo UI fidelity remain
open. Delivery CI remains owned by live one-ci (s15186).

## Final system verdict and wind-down, 2026-10-07

RAN: the already-running `w-1311` completes cleanly with all 79 system
checkpoints on source `f29ae4b7a` and the verified source-matched APK.
Filesystem, Device, KeepAwake, orientation, Share, Print, QuickActions,
AppIcon, Location, MapServices, the unenrolled LocalAuthentication path and
ScreenCapture window capture/delete/unsubscribe/resume checks pass.
Final system proof
preserves the pinned run command, source/APK hashes, all 79 hierarchy/status
records and inspected quality-90 native-pixel captures. Window capture
reports a real 1080x2400 PNG with 123543 bytes. This run does not prove
enrolled biometric success or actual recording/screenshot-event delivery.

RAN: the owned fixture is uninstalled and emulator/Metro cleanup runs.
A separate peer read finds no attached device or listener on 8097; owned
emulator PID 48333 is absent. All detached waits have finished and no live
children remain. Generated peer declarations match the pushed auxiliary
build-output savepoint, are copied into primary evidence, and only those
owned outputs are restored before removal. `tm worktree remove` removes
both local and pro-64 trees; their paths are absent and worktree lists
confirm removal. Raw APK/build/runtime receipts remain outside the trees
under primary `tests/native-features/evidence/android-restart-p66065/`.
No native/API work, build or new capability run starts after wind-down.
Delivery workflows and exact canary artifact verification remain assigned
to live one-ci (s15186). The remaining media and paired UI scope is parked
for Nate's revised lane plan, rather than marked complete.

## Open API suite, 2026-10-09

RAN: the Android `open` suite passes 10 checks on the pinned Pixel 8/API 37
AVD: route mount, `One.openURL` Chrome handoff and return,
`One.openShare` Copy completion, empty-share rejection, and
`One.openSettings` app-details handoff and return. Chrome's first-run
screens were completed on this AVD before the accepted run. Receipt:
`tests/native-features/evidence/one-native-android-suites/open-accepted/`.
The source-matched arm64 APK SHA256 is
`a2ab0f3fd404350a6d9fffc6b41d4964f91790eee9bff30b022edcd08e0ba6b1`.
The conformance command uses `--suite open --device-id emulator-5554
--package-id dev.vxrn.nativefeatures.tests --metro-port 8097`; Android
platform-tools must lead PATH for Bun. `bun run prebuild:native
--platform android`, the arm64 `:app:assembleDebug` build, package typecheck,
and the focused native coverage test pass.

## Database suite, 2026-10-09

RAN: the Android `database` suite passes 8 checks on the same Pixel 8/API 37
AVD. It proves synchronous and asynchronous parameterized SQL, row deletion,
closing and reopening a persistent database, key-value set/read/list/remove
across reopen, rejection of a query against a missing table, and clear.
Receipt: `tests/native-features/evidence/one-native-android-suites/database/`.
The installed arm64 APK is the unchanged native build above; only the JS
fixture and runner changed. Run with `--suite database --device-id
emulator-5554 --package-id dev.vxrn.nativefeatures.tests --metro-port 8098`
after `adb -s emulator-5554 reverse tcp:8081 tcp:8098`. The focused native
coverage test passes after regenerating the coverage table.

## Android Menu and ContextMenu suite, 2026-10-09

RAN: the Android `menus` suite passes 10 checks on the same API 37 AVD.
`One.Android.Menu` opens on tap and returns the selected action;
`One.Android.ContextMenu` stays closed on tap, opens on long press, and
returns its selected action. Disabled Menu tap and ContextMenu long press
leave both popups closed. Receipt:
`tests/native-features/evidence/one-native-android-suites/menus-accepted/`.
Android popup item nodes are not marked clickable in the captured hierarchy,
so the runner selects the exact unique visible label by bounds and verifies
the React callback. The native APK is unchanged. Run with `--suite menus
--device-id emulator-5554 --package-id dev.vxrn.nativefeatures.tests
--metro-port 8098` after reversing `tcp:8081` to `tcp:8098`. The focused
native coverage test passes after regenerating the coverage table.

## Android Color suite, 2026-10-09

RAN: the Android `color` suite passes 4 checks on the same API 37 AVD. It
proves platform black, static Material `primary` and dynamic Material
`primary` resolve to their rendered swatch pixels, with exact RGB matches
`[0,0,0]`, `[103,80,164]` and `[76,94,139]`; an unknown material role
returns `null`. Receipt: `tests/native-features/evidence/one-native-android-suites/color/`.
The native APK is unchanged. Run with `--suite color --device-id
emulator-5554 --package-id dev.vxrn.nativefeatures.tests --metro-port 8098`
after reversing `tcp:8081` to `tcp:8098`. The focused native coverage test
passes after regenerating the coverage table.

## Android Image suite, 2026-10-09

RAN: the Android `ui-image` suite passes on the Pixel 8/API 37 AVD. It proves
the bundled 48x32 asset event, remote 120x80 and changed 60x40 load events,
blank rejected-image pixels, and fresh-launch loads. All four image checks
pass; captured image-view bounds are 120x80 dp. Receipt:
`tests/native-features/evidence/android-native-ui-suites/image/`.
Run with `--suite ui-image --device-id emulator-5554 --package-id
dev.vxrn.nativefeatures.tests --metro-port 8097`; Android platform-tools
must lead PATH for Bun. The native APK is unchanged.

## Android TextInput suite, 2026-10-09

RAN: `ui-text-input` passes 16 captured checkpoints on Pixel 8/API 37.
Default text, editable=false, ref focus/blur/isFocused/clear, exact focus and
submit events, maxLength, NativeState-controlled updates/edits, and masked
secure entry pass. Disabled input rejects focus and IME opening; typing past
the limit rejects extra characters. The suite moves the caret to the end
before typing and inspects EditText descendants of Fabric test-ID wrappers.
It reuses the existing QuickNavigatePixel route input. Receipt:
`tests/native-features/evidence/android-native-ui-suites/text-input-final/`.
The installed native APK is unchanged, SHA256
`657ca0b7c9881f7f5a2e5636a0e95ae0c557cc8cf1c37b64d6b34f0fc37065fd`.
Command: `--suite ui-text-input --device-id emulator-5554 --package-id
dev.vxrn.nativefeatures.tests --metro-port 8098`, with device tcp:8081
reversed to tcp:8098. Focused fixture/runner TypeScript, formatting of the
fixture and coverage generator, and native coverage test pass. CI owner:
s23249; test-only delivery remains with the beta pipeline.

## Android Icon suite, 2026-10-09

RAN: `ui-icon` passes on Pixel 8/API 37 with the unchanged installed APK.
Default/font/frame/style sizes and image accessibility labels pass. The
four glyph crops contain 52, 90, 57 and 57 distinct colors; the unlabeled
decorative icon contains 56. Semantic danger and its native reference both
contain 19.8095% exact danger-color pixels; the explicit green matches the
same ink fraction. An invalid Android element throws the exact public
validation error before host rendering. This negative control calls the
synchronous validator; valid controls mount through React and Fabric.
Receipt: `tests/native-features/evidence/android-native-ui-suites/icon-accepted/`.
Command: `--suite ui-icon --device-id emulator-5554 --package-id
dev.vxrn.nativefeatures.tests --metro-port 8098`. Focused fixture/runner
TypeScript, fixture formatting, native coverage generation and diff checks
pass. CI delivery remains with s23249.


## Android effects suites, 2026-10-09

RAN: `ui-effects` passes all 174 checks on Pixel 8/API 37, covering Mask,
EdgeFade mask/overlay/blur, Blur, sampleCurve and serializeCurve. Bypass,
wrong curve, opaque effect, empty content, zero radius/intensity, and wrong
foreground controls reject their intended gates; every effect restores.
Actual smooth samples reject the linear predicate and actual linear
serialization rejects the smooth predicate. Mask half alpha is 0.498039.
Blur foreground MAE is 0.0; its backdrop left/right is 0.464151/0.743391.
EdgeFade blur contrast is 0.001795 against sharp 0.048004.

The suites fix four Android causes: Mask changed visibility during drawing
and never reached idle; FrameLayout replaced Fabric child bounds in the
native effect containers; EdgeFade radius zero entered the alpha-mask path;
Blur applied a Gaussian to a uniform tint instead of the actual backdrop.
Mask now skips its alpha child in the content pass. Mask and EdgeFade leave
child layout to Fabric. Zero radius draws sharp content. Blur records only
the preceding backdrop into a retained RenderNode, leaving foreground sharp.

The fixture quantizes stripe boundaries to physical pixels. Its former
10.5px rows left five one-pixel foreground gaps over the changed backdrop,
producing 0.024293 MAE. The existing pixel gates are unchanged; iOS 3x stripe
boundaries are unchanged. Geometry checks account only for Android's pixel
rounding and independently read the native density and accessibility bounds.

Receipt: primary `tests/native-features/evidence/android-native-ui-suites/effects-aligned/`.
Earlier failing captures remain in `effects-current/`, `effects-layout-fixed/`
and `effects-final/`. Build logs, APK and source hashes are in sibling `build/`.
APK SHA256: `b10b7581b2246ea9e0e01d6e6761b3adf09863aea4f3f8899fc05c82f213b206`.
Command: `--suite ui-effects --device-id emulator-5554 --package-id
 dev.vxrn.nativefeatures.tests --metro-port 8098`, with platform-tools first
on PATH and device tcp:8081 reversed to tcp:8098.

RAN: arm64 Android assembleDebug, 25 effect contract tests, focused TypeScript,
fixture/helper/coverage formatting and generated native coverage pass. A local
runtime build with SKIP_TYPES=1 and `bun release --into ~/contrast` installs
17 packages; installed Kotlin bytes match source. Full vxrn type emit was
canceled after seven minutes without a result; build diagnostics/cancellation
defect t-mv1k0t0j-yoh0 is filed in team-machine. Recompiling Kotlin without
its incremental cache resolves the intermediate internal-class access error.
Exact progressive/live-scrolling EdgeFade and live tint/lifecycle Blur remain
explicit limits in COVERAGE.md. CI, native build and canary delivery belong
to s23249; runtime acceptance does not assert their result.
