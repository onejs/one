# Android Location proof

RAN: `w-3f59` passes all 27 `system-location` checkpoints on the standard
Pixel 8/API37 r06 fixture at the identity in [source.json](source.json).
Prompt and concurrent requests, current coordinates, watch movement/stop,
forward/reverse geocoding, background delivery and permission denial pass.
Native Location code is unchanged.

Both background legs persist their exact injected coordinates while the
application is backgrounded. Without notification permission, the service
retains foreground id 4301, Location type 8 and its one-location channel
while the drawer record is absent. With the grant verified, System UI opens
through a recorded touch gesture and displays the actual foreground notice.
Stopping each watch removes its service and active notification record.
[Check receipts](checks/) preserve coordinates, grants, service records,
notification content, hierarchy and the permission-revocation events.

The original runner expected a watch callback after permission revocation.
[Failure events](failure-revoke-events.txt) show Android killed that process
for `permissions revoked` and started a new one. The corrected check requires
that exact kill event, both permissions removed and a changed PID before
reopening the fixture. The new process reports denied permission; current
position, foreground watch and background watch reject with
E_LOCATION_PERMISSION. No Location service or notification remains.

[run.sh](run.sh) pins source, verifies the reused native APK and fixture
sources, requires a complete Metro bundle, installs a fresh owned fixture
and removes it after [27 passing checks](run.log). Emulator and Metro stop
through its owned-process cleanup. Generated declarations are preserved;
no native source or public API changes. Existing deadlines remain.

RAN: the local 17-entry One release into Contrast reuses the verified beast
current-beta outputs because package sources are unchanged. Installed
Location Kotlin bytes match. Downstream manifest and lock bytes match their
immediate pre-release snapshot. A separate peer read after cleanup shows
no attached device and no Metro listener on 8097.

Quality-90 WebPs preserve 1080x2400 native pixels without scaling. The
notification and denial detail crops preserve their original pixels;
[media.json](media.json) records dimensions, sizes and hashes. Every encoded
image was inspected before sharing. Raw PNGs, APK and full logs remain in
primary tests/native-features/evidence/android-restart-p66065/.
Full system/media and paired Expo UI acceptance remain open.
