# Android debug startup and Compose picker acceptance

TESTED: on 2026-10-07, `w-d72b` reaches Home and passes all 15 existing
`compose-pickers` checkpoints on Pixel 8/API37 r06 after clearing the synthetic
fixture's data. [Runtime output](runtime.txt) records rejected and accepted
date changes, disabled-date handling, time selection, dialog confirm/cancel,
reopen and remount. [Date](android-date-picker.webp) and
[time](android-time-picker.webp) captures are quality-90 WebP, 1080x2400,
49,284 and 46,736 bytes respectively, inspected at original resolution.

RAN: before repair, `w-38b2` fails `compose-home` with the Android 17
local-network permission prompt visible. READ: RN 0.87.1 waits for
`ACCESS_LOCAL_NETWORK` before reaching Metro. The runner granted it only
after data clear; shared debug-host setup now grants it on API37 and above.
Only the debug-network permission is granted. Permissions belonging to the
service fixtures retain their existing tests.

The unchanged arm64 APK was built from `cf508a1eb`; runner source is
`92a0231cd`. APK SHA256:
`21547ef2b7da9f235d20569c05a70e9226a1574153bb9705ba26a791e275574c`.
Runner SHA256:
`4b7f38dcf6d2390c1cc3db8de3d5380d91bd356e07b8b6ccfefe3b1ff7d528cb`.
Picker fixture SHA256:
`1fee3cf6edf6d4bcff696766c2a76f9cfd0c78b5209302f24f35fdc42502b8d4`.
Physical size is 1080x2400, density 420, Android 17/API37.0. Metro serves
the source-matched worktree locally on pro-64 at 8097; emulator-5582 maps
device tcp:8081 to host tcp:8097. An earlier prohibited SSH tunnel provides
no runtime verdict.

RAN: One dependency build, Android prebuild and arm64 debug APK assembly pass,
as do 31 Compose contract tests and 127 native documentation tests. The local
One release installs 17 package entries into contrast using these build
outputs. All native services and paired Expo UI pixel fidelity remain outside
this checkpoint's acceptance.

The baseline frame/XML, all 15 PNG/XML checkpoints, native APK, source hashes
and logs remain in primary `tests/native-features/evidence/android-restart-p66065/`.
After proof, adb lists no devices on pro-64, the owned emulator PID is absent
and Metro8097 has no listener. The Peach lane was notified that the AVD is free.
