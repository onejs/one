---
id: t-mv7fki4n-245y0
title: Fix One release preflight and partial-version collisions
status: done
owner_status:
  state: landed
  text: One2.6.20 published; actual npm tarball and source ancestry verified; release repair worktree removed
  updated_at: 1791944369275
assignees:
- p84640
labels:
- branch:oss-fixer/one-2026-10-14
- lane:oss-fixer
backend: git
created_at: 1791941276615
updated_at: 1791944369324
field_marks:
  active_form: 1791941276615
  body: 1791944369324
  claim: 1791941276615
  evidence_summary: 1791941276615
  owner_status: 1791944369324
  parent: 1791941276615
  priority: 1791941276615
  recovery_ref: 1791941276615
  status: 1791944369275
  title: 1791941276615
---
CI owner oss-fixer. RAN main Release38494742896 source420b4ebd failed overwrite2.6.18; prior38489759516 published dependency family18 but One missing after30m exact verification. TESTED real npm12 view returns JSON array, existing string comparison false; API exact endpoints confirm deps18 present/One18 absent. Baseline actual release CLI regressions prove unnecessary republish and choosing occupied patch18;503 lookup also must fail closed. Scope scripts/release.ts, release-publish.ts, release-publish.test.ts. Replace CLI parsing with existing exact registry helper, choose unoccupied stable patch across release family, preserve registry-error failure. No new public API or source navigation changes. Different-family large review, requiredCI, merge/automaticpatch and actualtarball verification. Keep Screens/Navigation canary PR857 separate and held for Nate main/minor approval.

2026-10-14 01:54Z RAN normal merge at exact reviewed head3a89357d; required checks/tests success. TESTED reviewer33tests and fail-closed probes approved. RAN source correction: resolveStableVersion returns skipBlockedVersions(next, options.mode), so occupied-family loop preserves blocked-version rules. npm now reports One2.6.18/source36867c8a; earlier registry absence resolved, not evidence of current source delivery.

TESTED npm pack One2.6.20/source1b992f990d752550fb6fc0894878f5e86f612d06: ESM and CJS immediate snapshot/deferred listener/unsubscribe probes pass. RAN git ancestry asserts tagv2.6.20 contains repairmergec8e1e794 and One852mergef968c673. Main Release success via w-1c6b87. Artifact/probe retained /tmp/oss-fixer-one-2.6.20; shared patch result.
