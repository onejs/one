---
id: t-mv1fu9nu-7yq0
title: Prove Android Updates release APK acceptance
status: done
assignees:
- m28120
labels:
- lane:contrast-android
backend: git
created_at: 1791578935146
updated_at: 1791592410744
field_marks:
  active_form: 1791578935146
  body: 1791592410167
  claim: 1791578935146
  evidence_summary: 1791578935146
  owner_status: 1791578935146
  parent: 1791578935146
  priority: 1791578935146
  recovery_ref: 1791578935146
  status: 1791592410667
  title: 1791578935146
---
Umbrella: t-mv1df5zd-21lg. Parent session: p73218. Goal: run the unchanged full One Android Updates release APK suite on pro-64 Pixel 8 Android 17/API 37r06. First inspect retained current APKs; if none has provable source/runtime identity, build through Contrast bun remote with updates-suite-release.gradle and URL http://10.0.2.2:8471, keeping package debuggable only for run-as and ReactNative BuildConfig.DEBUG false. Prove source/generated runtime/version/URL identity and APK SHA, then run all eight publish/lifecycle/failure cycles with the shared Android lease and no acceptance changes. Preserve evidence outside this worktree. No source owner fix expected; if a runtime defect appears, patch only on this source branch and push tested source before v2-beta integration. Contrast CI r67941/m23914 and parent p73218 own integration and delivery; no independent CI watch. Handoff: /Users/n8/one/scripts/tmp/android-one-updates-release-result.md.

Sole lane worktree: /Users/n8/.worktrees/one-android-updates-release on tm/android-updates-release. Coordinator direction (2026-10-09): after focused validation, land the One fix with git push HEAD:v2-beta; retain parent ownership of Contrast integration and delivery.

Nate correction relayed by p73218 (2026-10-09): One source should land directly on the shared ~/one v2-beta checkout. Keep this owned tree until the active release APK acceptance run finishes; then transfer only this lane’s source edits into v2-beta safely, preserve co-tenant edits, and remove this tree after preserving evidence.

RAN: APK source 663f8c25892d65175f4380e27b1e3650c55e3937, SHA256 3b6229b9dff91ff1ea115b00700ad91717a5ed4528b7b61a06982036f82a57fb; generated release BuildConfig.DEBUG=false; manifest URL/runtime identity verified. Runtime evidence on pro-64 at /Users/n8/contrast/scripts/tmp/android-one-updates-release-20261009-attempt4: eight publish dirs, 148 PASS lines, final suite pass, runtime_exit=0, cleanup_exit=0, fixture hashes restored, app uninstalled, emulator/lease/server cleaned. Landed commit 20e3a93b7ee3ced126e69166a8d467d8aaa5e8d2 and verified refs/heads/v2-beta. INFERRED: intervening 663f8c..373a641 changes did not touch Updates runtime or fixture paths; full suite was not repeated on 20e3a93. The owned proof worktree is clean and ready for removal.

Cleanup complete: tm worktree remove retired /Users/n8/.worktrees/one-android-updates-release after the source commit and evidence were preserved. The shared v2-beta checkout still contains only the co-tenant adaptive edits as uncommitted work; they were left intact.
