# Android OS background delivery proof

This focused consumer embeds production BackgroundTasks JavaScript from this
checkout and compiles the actual One Android package. It has a distinct
`dev.onejs.backgroundproof` install, no dev server, no simulated launches,
and no mounted surface during cold delivery. The small receipt module only
records observations; submission, dispatch and completion use One and
WorkManager unchanged. Before scheduling, the mounted fixture also calls
Calendar reminders through the production Nitro adapter, checking creation,
completion filtering, deletion, invalid input, and a missing identifier.

This standalone consumer has its own package boundary so native-source
prebuild does not copy its application classes into the parent fixture.
Its Gradle init script selects `src` explicitly for this proof's APK.

For an event-driven build and proof job, run `build-and-run.sh` with the
generated Android consumer path, Gradle executable, claimed serial and evidence
directory as arguments. Set `ADB` and `SIM_CLAIM_SCRIPT`. Wrap it in one
`tm window run heavy` inside `tm wait --exec`, with a maximum 45-minute wait.
The script stops its emulator and releases its claim on completion or failure.

Build the embedded bundle with `node build-bundle.cjs` under `tm window run
heavy`. Build a generated native-features Android consumer with Gradle 9.4.1,
`-I <this-directory>/proof.init.gradle`,
`-Done.services.sourceRoot=<checkout>`, `-PreactNativeArchitectures=arm64-v8a`
and `:app:assembleDebug`, also under a heavy window. The init script redirects
One and its autolinking/codegen paths to this checkout and replaces only the
proof app's manifest, sources and output directories. The CMake staging
directory and relocated autolinking input also stay inside this fixture.
Metro explicitly indexes both the checkout root and
external installed dependencies; the programmatic bundle API does not add
the project root to its crawl roots. The evidence captures the source commit
and both bundle and APK SHA-256 digests. It leaves the generated consumer's
sources untouched.

The runner grants notification access and ReactActivity's debug-only API 37
local-network permission before starting the embedded bundle. No Metro server
is involved.

On a claimed, idle API 37 device, unplug the emulated battery before launching.
The mounted fixture schedules one delayed refresh and three charging-gated
processing requests, cancels one, and rejects an unconfigured identifier.
Capture the `scheduled` receipt, background the Activity, await Android's
`wm_on_stop_called`, run `am kill`, await its matching `am_kill`, and assert
`pidof` is empty. Enable charging and allow JobScheduler to dispatch
normally. Do not use `cmd jobscheduler run`, the debug deep link, force-stop,
or an Activity relaunch to manufacture delivery.

Run `node run-proof.mjs <claimed-serial> <apk> <evidence-directory>` with
`ADB` pointing at the Android SDK adb binary. It records the following evidence
and runs the verifier automatically. The caller owns device admission and
cleanup.

Capture the app's `files/background-proof.jsonl`, the post-kill PID output,
the host millisecond timestamp immediately before enabling power, and the
WorkManager database plus its WAL and SHM files from `no_backup`. Run
`python3 verify.py <evidence-directory>`. This checks exactly-once handlers
in a new process with no Activity or React surface, earliest-time and power
constraints, cancellation, unknown-ID rejection, successful completion, and
failed-handler propagation into actual WorkSpec states.

## Recorded acceptance

TESTED on API 37, 2026-10-12: the current-beta native build at `5826934cb`
passed (`:app:assembleDebug`, 370 tasks). The runner's lifecycle correction is
recorded with the build as `runner-diff.patch` and `runner-sha256.txt`.
Android stopped the Activity and killed PID 4497 with reason `kill background`.
`pidof` was empty before power was enabled. OS scheduling started PID 4585,
which loaded the embedded JavaScript and ran exactly three distinct handlers
without creating an Activity or mounting a React surface.

The processing success and intentional failure ran only after charging was
enabled. Refresh ran after its earliest timestamp. The cancelled request had
no handler. The native WorkManager database independently recorded refresh
and processing success (state 2), cancellation (state 5), and handler failure
(state 3). Unknown submission rejected with `E_BACKGROUND_TASK_INPUT`.
The same run passed Calendar CRUD/filtering and invalid/missing-ID assertions
through the real React/Nitro adapter. Wrong PIDs, extra handlers, early delivery,
mounted cold surfaces, incorrect errors or wrong database states fail the
verifier. Event waits retain their original 180-second budget.

Evidence lives outside the managed tree in
`/tmp/one-android-services-v2-evidence/background-runtime9`: native build log,
receipt JSONL, lifecycle logcat, battery/job dumps, WorkManager database/WAL,
and `verification.txt`. Bundle SHA-256:
`8e665db6e0c3614dbf74b676536c34f3e5c2870468473e430cdd7a4ca1bcf806`.
APK SHA-256:
`b6cbd7e77ff1e138adc9c96d22a02b413d74653fbb4b65add17f379d4f567865`.

This establishes runtime behavior on this emulator. Physical proof remains
separate. This fixture does not exercise Play review UI. CI and final release
acceptance remain separate from this focused proof.
