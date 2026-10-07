# Android Compose runtime proof

RAN: `w-50db` passed all 22 checkpoints of the existing `--suite compose`
on the standard Pixel 8 Android17/API37 r06. Checkbox rejects a controlled
change; RadioButton selects the second option. Cards and both divider
orientations mount. FilterChip rejects then accepts selection and its
disabled control emits zero requests. AssistChip, InputChip and
SuggestionChip deliver their events; the disabled chip emits none. Badge
geometry passes. Home navigation succeeds between every screen.

The previous cold run `w-95df` failed before Home. Its log starts the Metro
load at 23:08:28 and creates the bundle loader at 23:08:54; its final screen
is blank. INFERRED: the first bundle consumed the 15-second Home deadline.
The passing script requires a complete successful Android bundle HTTP
response before installing and launching the app. Runner timeouts and
assertions are unchanged. This setup change does not establish a cold-start
performance result.

[Source identity](source.json), [check output](runtime.txt), and the exact
[passing script](run.sh) are preserved here. The script uses the assigned
Mac worktree, existing APK and oracle. Run under resource admission:

```sh
tm window run heavy -- bash tests/native-features/proofs/android-compose/run.sh
```

The script refuses an occupied emulator, an AVD already attached on this
Mac, or an occupied Metro port. It starts local Metro8097, completes
`/index.bundle?platform=android&dev=true&minify=false`, installs the APK,
clears synthetic fixture data and runs the unchanged suite. Owned emulator
and Metro processes stop on exit. Full PNG/XML checkpoints, Metro/logcat,
prepared bundle and device metadata remain under primary
`tests/native-features/evidence/android-restart-p66065/runtime-compose-warm-pro128/`.

Native 1080x2400 quality-90 WebP captures were inspected and shared without
resizing. [FilterChip](filter-chip.webp), [chips](chips.webp), and a
[native-density detail crop](chips-detail.webp) show accepted state. The
source receipt pins all six fixture screens, the runner and native owner.
Those fixture/native sources are unchanged between the APK build and run;
only runner debug setup and documentation changed.

This is One's behavioral acceptance, not an Expo pixel comparison. The
focused suites for the other Compose controls and the system/media API
post-land runs remain separate acceptance units.
