# Android Share callback proof

RAN: all six `system-share` checkpoints pass on the standard Pixel 8/API37
r06 at the source in [source.json](source.json). Copy completes without an
activity name and copies the exact text and URL; a second call rejects busy;
the file chooser cancels with completed=false; empty, missing-file, invalid
URL and blank-text guards pass. The idle fixture and Copy chooser are
asserted before interaction. Existing deadlines and final assertions remain.

RAN: [failure-callbacks.txt](failure-callbacks.txt) records initial host
resume scheduling settlement before chooser launch. Settlement runs while
paused, before the user selects Copy; RESULT_OK subsequently arrives with
no pending promise. The repair removes settlement from host resume. The
chooser result remains the completion source and its existing broadcast
grace interval remains. Resume no longer starts a completion
timer; validation makes no speed claim. The final native source has no
probe logging.

[run.log](run.log) is the completed verdict recovered from the original
remote process after its outer Team Machine session lost projection during
a fleet restart. [run.sh](run.sh) pins source, builds the changed Android
app target, requires a complete local Metro bundle, installs a fresh owned
fixture and removes it after preserving receipts. Gradle completes in 18s
with 39 executed tasks and 331 up to date. [downstream.json](downstream.json)
records the 17-entry local One release into Contrast and matching Kotlin
bytes. Unchanged JS sources reuse source-matched beta build outputs.

The four quality-90 WebPs preserve native pixels: full screens are
1080x2400, with an additional 1080x600 detail crop at y=280. Raw PNGs, APK,
full build logs, diagnostic source copies and cleanup receipts remain in
primary `tests/native-features/evidence/android-restart-p66065/`.
Full system and media acceptance remain open.
