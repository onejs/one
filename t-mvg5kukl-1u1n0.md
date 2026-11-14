---
id: t-mvg5kukl-1u1n0
title: 'One main Android e2e: PixelLauncher ANR dialog covers MainActivity before the first fixture launch (run 39361284837)'
status: done
labels:
- tm-defect
- umbrella:rsi
priority: 3
backend: git
created_at: 1792468692165
updated_at: 1792468894294
field_marks:
  active_form: 1792468692165
  body: 1792468894294
  claim: 1792468692165
  evidence_summary: 1792468692165
  owner_status: 1792468692165
  parent: 1792468692165
  priority: 1792468692165
  recovery_ref: 1792468692165
  status: 1792468894294
  title: 1792468692165
---
From ci-manager p96184 (mail 03:54Z), evidence by OSS 104486 from retained artifact 12238605297 (verified SHA/CRC; report on Pro64 ~/.team-machine/coordinator/updates/oss-one39361284837-evidence/report.md, do not refetch): One MAIN run 39361284837 source a5001818a2b, all 5 mount checks fail; all 5 XML dumps show 12 nodes with the PixelLauncher 'isn't responding' dialog and dumpsys focus on the foreign ANR above MainActivity. ANR at 03:10:50 precedes first fixture launch 03:12:20.949; screenshot shows the test home behind the dialog. INFERRED: a foreign launcher ANR obstructs accessibility; not a One code cause. Constraints from ci-manager: no new device, no reruns, no assertion weakening.

RSI finding (read-only; no source change, no rerun, no device, original evidence on Pro64 not refetched; one other run's artifact read below).

RAN timeline from job 118432134253 log + original emulator.log/dumpsys: boot step started 03:10:01; emulator "Boot completed in 44806 ms"; sys.boot_completed=1 seen 03:10:47.56; `adb install` of the 59 MB APK started 03:10:47.9; launcher "Waited 5000ms for FocusEvent(hasFocus=true)" ANR at 03:10:50 (dumpsys lastanr); dev server up 03:11:16; first fixture launch 03:12:20.9.
RAN in the suite logcat the launcher paused normally on that launch (wm_pause_activity 03:12:20.949, wm_on_paused_called +7 ms), so the launcher main thread had recovered by then. The ANR was a transient stall; the dialog stayed only because Android never auto-dismisses it and nothing in the run dismisses it.
INFERRED cause: the ANR lands 3 s after sys.boot_completed, on the launcher's first-ever focus on a cold AVD (-no-snapshot, swiftshader_indirect, 4 GB guest, emulator warns host RAM 15989 < 16384 MiB), while the workflow immediately starts an APK install and the adb shell commands. sys.boot_completed means the framework booted, not that the launcher/GMS first-run work has settled, so a 4 vCPU runner stalls the launcher past 5 s. Falsifier: the launcher's pre-03:12:19 logcat/am_anr CPU block would show it; it is gone because each suite runs `logcat -b all -c` before starting and the failure dump runs after, and dropbox is not collected. Not proven: which competing process starved it.
RAN frequency: of the recent failed fixture jobs on this workflow only this one shows it. Run 39306776009 proof shard failed with the same "app-mounted ... missing home-screen" text but its dumpsys says "no ANR has occurred since boot" and its 01-failure.xml is a different capture, so that is another cause. Other recent main/PR runs (39359581396, 39341448227, 39336221368, 39323314403) passed all shards. Rate: 1 observed in the recent window, not recurring.
Environmental action: none to restore. GitHub-hosted runners and the emulator are created fresh per job and destroyed at job end, so there is no runner or launcher state to repair or clean. The supported recovery is the normal next CI run (main run 39366646412 at d0fd3fb48 is in progress) or a rerun of the failed `system` job through CI, which ci-manager owns. No external or destructive action needed, so no tm ask.
Possible future hardening (not applied; scope forbids a source patch and needs owner/ci-manager choice): wait for the launcher to be idle (e.g. `dumpsys window | grep mCurrentFocus` is the launcher and no ANR in `lastanr`) before the install, keep the pre-suite logcat of the boot window so a repeat has the ANR CPU block. With 1 observation in the window I do not recommend changing the workflow yet.
