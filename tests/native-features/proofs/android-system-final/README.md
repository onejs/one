# Final Android system proof

RAN: the existing `w-1311` finishes cleanly with all 79 system checks at the
source in [source.json](source.json) on the standard Pixel 8/API37 r06.
[run.log](run.log), [run.sh](run.sh), source/APK hashes and all 79
[hierarchy/status records](checks/) preserve the exact acceptance.

The sweep covers filesystem, Device, KeepAwake, orientation, repaired Share,
Print, QuickActions, AppIcon, Location, MapServices search/input guards,
unenrolled LocalAuthentication and ScreenCapture window capture, deletion,
unsubscribe and resume. Location includes background delivery with denied
and granted notification permission, foreground notice visibility, service
cleanup and denied APIs after permission revocation kills the old process.
Window capture reports a 1080x2400 PNG with 123543 bytes. Enrolled biometric
success and actual recording/screenshot-event delivery are not tested.

Six quality-90 WebPs preserve native pixels without scaling, with separate
detail crops. [media.json](media.json) records dimensions, bytes and hashes;
all encoded images were inspected. Window capture and the MapServices and
biometric result details were shared with Nate at close-out. Earlier units
have their own shared captures in adjacent proof directories.

The run requires a complete Metro bundle and source-matched verified APK,
then removes its owned fixture and stops emulator/Metro. A separate
[cleanup read](cleanup.txt) finds no attached device or listener; the
owned emulator PID is absent. Raw APK, PNGs and logs are preserved outside
the removed worktrees in primary evidence/android-restart-p66065/.

The lane stops at Nate's wind-down request. No new capability or runtime run
starts. Media reruns and paired Expo UI fidelity remain open in the lane
plan. This final result preserves the current step rather than completing
the broad Android goal.
