---
id: t-mvilrlzd-1qk70
title: Review PR 1003 Android SDK package caching
status: done
assignees:
- m50768
labels:
- lane:release-review
- umbrella:one
backend: git
created_at: 1792616813833
updated_at: 1792616993064
field_marks:
  active_form: 1792616813833
  body: 1792616993064
  claim: 1792616813833
  evidence_summary: 1792616813833
  owner_status: 1792616813833
  parent: 1792616813833
  priority: 1792616813833
  recovery_ref: 1792616813833
  status: 1792616993064
  title: 1792616813833
---
Read-only independent review of exact 8386f23d2b88a11c8332e14ebece9e675d5e1118. Check Android home/path/key/revision parse, PR cache isolation, miss behavior, package completeness and save races. Use retained evidence, bounded disposable probe only if needed; no producer/build/device/source edits. CI p96184 owns gates; source p100604; release r110538. Report ~/.team-machine/coordinator/updates/oss-one1003-review.md and finish.

One PR1003 independent review complete: APPROVED exact 8386f23d2b88a11c8332e14ebece9e675d5e1118, base 3ab6ebbc567645087b3fdd8fd95d6bdb20e230b5. No blocking finding.

Report: /Users/n8/.team-machine/coordinator/updates/oss-one1003-review.md

RAN complete two-file source/context review and official setup/cache contracts. TESTED six bounded extracted-shell checks: both package paths/keys in restore/save modes, real spaced NDK revision 27.1.12297006 and unspaced image revision 6, old-parser negative control, cold restore without source.properties. No SDK tool/cache/network producer in probe. Local image properties were API37 Play Store ARM solely for parser format, not the workflow x86 image.

INFERRED cache correctness: Ubuntu root variables agree with setup-android; PR restore has no post-save and explicit non-PR save follows successful installer; package metadata/payload cached together; miss keeps ordinary installer failure; exact-revision lookup does not restore bytes; immutable cache reservation handles concurrent image saves. Nonblocking DRY simplification: identical primary key and restore-keys prefix is redundant.

RELAYED author proof runs 39662444726/39668958354 populated then restored seven jobs with no sdkmanager payload downloads and all green on ddaed5bd9c5d2fde5917ffb522adf1f9b24ffca4. Final parser-only fix has own local probe, no final full-CI pass claimed. CIp96184 owns natural 39674740047/39674739923 and gates; source/landing p100604, release r110538. No CI wait/log fetch/rerun, native/device/build producer, edits/push/spawn. No worktree/service/claim/watcher created. Evidence retained under /Users/n8/.team-machine/evidence/oss-one1003-review/.

Separate PR1002 request-changes verdict remains held with original author; this review does not replace or resolve it.
