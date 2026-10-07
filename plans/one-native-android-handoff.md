# One Android close-out, 2026-10-07

Stopped at Nate's wind-down request, relayed by coordinator. No new run or
capability starts. Broad goal remains Android first-class: One native UI
matches Expo on Android, then Android native APIs. Detailed result and
source-pinned Pixel 8/API37 entry: [lane plan](one-native-android-lane.md).

Landed and pushed to `v2-beta`, never One main:

- `9c7efefaa`: fresh-install API37 debug local-network grant; 15 picker checks.
- `be9dcdfa1`: full Compose proof; 22 checks.
- `30b35c114`, `6d5e95a9d`: Share Copy and Print system-window proof.
- `28097e9d3`: stable AppIcon host/launcher aliases; eight focused checks.
- `0818352e8`: Share waits for chooser result; six focused checks and exact
  failure callback order proving premature settlement on resume.
- `acc949ff8`, `f29ae4b7a`: 27 focused Location checks, stronger permission
  preconditions/revocation process checks, preserved native captures.

RAN: final existing `w-1311` passes all 79 system checks at `f29ae4b7a`,
through filesystem, Device, KeepAwake, orientation, Share, Print,
QuickActions, AppIcon, Location, MapServices, unenrolled LocalAuthentication
and window capture/delete/unsubscribe/resume. Proofs are in
`android-system-final` (proof no longer committed) and adjacent unit dirs.
RAN: beast builds and 158 Compose/documentation tests pass; changed Android
targets compile. Local release installs 17 package entries into Contrast,
native bytes match and immediate downstream manifest/lock bytes remain.
Quality-90 native-pixel captures and detail crops inspected/shared with Nate.

Working branch was `tm/one-native-android-location-ready`; all source pushed.
Auxiliary `tm/one-native-android-build-outputs` at `8172ae63e` preserves
generated declarations only. APK SHA256:
`652f08da010fc553c4ed1a48874e54aa3af4d6f6e03a8581dfcbc92be0017a5d`.
Raw APK/build/runtime evidence remains in primary
`tests/native-features/evidence/android-restart-p66065/`.

RAN cleanup: owned fixture removed, no emulator/Metro8097 listener, no live
children or active waits. Both owned worktrees removed with `tm worktree
remove`, including pro-64 `one-native-android-api`; removal receipts and
preserved generated outputs are in primary evidence. No retained tree or
service. Existing downstream local package installation remains documented.

CI delivery owner: live one-ci (s15186), assigned by coordinator. Required
Release, Checks and Tests, Android Native Build and exact canary content
verification remain its delivery work; a canary is not a test verdict.

Remaining work waits for Nate's new plan: post-land contacts/calendar/photo/
audio runtime, remaining focused Compose suites, paired Expo UI pixels and
host sizing/lifecycle, IME window ownership, predictive back and insets.
No enrolled-biometric success or actual recording/screenshot-event delivery
is claimed. No implementation blocker needs a new lane now. Broad goal is
unfinished; task `t-muxovdux-1p640` is parked with this stopping point.
