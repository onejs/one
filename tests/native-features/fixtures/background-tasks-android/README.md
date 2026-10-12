# Android OS background delivery proof

This focused consumer embeds production BackgroundTasks JavaScript from this
checkout and compiles the actual One Android package. It has a distinct
`dev.onejs.backgroundproof` install, no dev server, no simulated launches,
and no mounted surface during cold delivery. The small receipt module only
records observations; submission, dispatch and completion use One and
WorkManager unchanged. Before scheduling, the mounted fixture also calls
Calendar reminders through the production Nitro adapter, checking creation,
completion filtering, deletion, invalid input, and a missing identifier.

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
One to this checkout and replaces only the proof app's manifest, sources and
output directory. Metro explicitly indexes both the checkout root and
external installed dependencies; the programmatic bundle API does not add
the project root to its crawl roots. The evidence captures the source commit
and both bundle and APK SHA-256 digests. It leaves the generated consumer's sources untouched.

On a claimed, idle API 37 device, unplug the emulated battery before launching.
The mounted fixture schedules one delayed refresh and three charging-gated
processing requests, cancels one, and rejects an unconfigured identifier.
Capture the `scheduled` receipt, background the Activity, run `am kill`, and
assert `pidof` is empty. Enable charging and allow JobScheduler to dispatch
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

An emulator result establishes Android runtime behavior on that emulator.
Physical-device and Play-enrolled review-dialog acceptance stay separate.
