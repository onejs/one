# Android AppIcon runtime proof

RAN: `w-c4c2` passes all eight focused AppIcon checkpoints on the canonical
Pixel 8 Android17/API37 r06. Switching selects TestAlternate with the same
PID3695 and app window focus. A cold relaunch preserves support and the
selection. Restoring Primary preserves the new PID4635 and focus. Invalid
input rejects with E_APP_ICON_INPUT while preserving Primary and the host.
The checkpoint predicates query process, window and resolved launcher state
in addition to the visible fixture result.

The original fresh-install baseline disables MainActivity and loses its
window. Preserving MainActivity alone still loses the running launcher
alias. A forwarder in the same task also fails because Android removes
tasks rooted at a disabled alias. The passing configuration forwards from
an empty-affinity launcher task into the permanent MainActivity task with
NEW_TASK. One rejects alias-rooted tasks before mutation, switches only
launcher aliases and caches immutable manifest defaults for cold starts.
The captured launcher Kotlin is stored as `.kt.txt` so native source
discovery cannot compile the proof copy. Manual Android setup and the
fixture generator agree; the public JS API
is unchanged. Native work costs one immutable APK parse per object and one
task snapshot per support query or user-initiated swap, outside rendering.

The runner also strengthens Home navigation: its earlier clipped row tap
rounded to y2400 on the 2400-pixel device. It now requires row bounds
strictly inside the viewport and records the fresh tap bounds. AppIcon's
15-second deadline and its assertions are unchanged.

[Source identity](source.json) distinguishes the compiled APK source from
the runtime runner source. Their AppIcon Kotlin and generated manifest
writer are identical. `run.sh` retains the exact passing setup, including
the APK checksum and native-source checks before reuse. Build this fixture
with `bun run prebuild:native --platform android`, run
`bun scripts/prepare-android-app-icon-alias.ts`, then build the arm64 app.
Run `bun scripts/one-native-conformance.android.ts --device-id <serial>
--package-id dev.vxrn.nativefeatures.tests --metro-port 8097 --suite
system-app-icon --artifact-dir <output>` from `tests/native-features`, with
its source-matched Metro server and installed APK.

Quality-90 WebPs retain native pixels: alternate 1080x2400/34642 bytes,
primary 1080x2400/33528 bytes and invalid 1080x2400/35420 bytes. The alternate
detail is a native 1080x950 crop, 26302 bytes. All encoded captures were
inspected at original resolution. Full PNGs, APK, logs, earlier failures
and setup inputs remain in primary
`tests/native-features/evidence/android-restart-p66065/`.

RAN: the owned synthetic fixture is removed after retaining component
receipts; adb lists no devices, Metro8097 has no listener, and the peer
worktree is clean. This proves AppIcon; remaining system/media services
and paired Expo UI fidelity remain open.
