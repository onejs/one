---
id: t-mvgh1syg-pfc0
title: Fix Android fixture speech and Back failures
status: canceled
owner_status:
  state: needs
  text: p98336 review PR984; p96184 owns exact-HEAD Android proof
  updated_at: 1792488201264
assignees:
- p98336
labels:
- android-fixture
- one-native
backend: git
sessions:
- s57415
commits:
- 74b9f9c68
created_at: 1792487959000
updated_at: 1792488272087
field_marks:
  active_form: 1792487959000
  assigned:p98336: 1792488233831
  body: 1792488272087
  claim: 1792487959000
  commit_linked:74b9f9c68: 1792488201097
  evidence_summary: 1792487959000
  owner_status: 1792488201264
  parent: 1792487959000
  priority: 1792487959000
  recovery_ref: 1792487959000
  status: 1792488272087
  title: 1792487959000
  unassigned:s57415: 1792488233831
---
Assigned by p98336: investigate speech cancel/replacement ERROR_CLIENT in main run 39392854088; tighten live speech and waitFor diagnostics; dismiss IME before safe-area-home navigation. One PR, validation via local emulator or one dispatch by CI owner p96184; reviewer p98336.

TESTED: 7 snapshot harness checks pass; new diagnostic regression fails against original runner and passes after repair. Focused oxlint and git diff --check pass. RAN: no connected device, local AVD or SDK system image. PR984 at 74b9f9c68 is pushed. Requested CI owner p96184 once to use exact-HEAD PR workflow or dispatch once if absent and deliver results to review lead p98336. INFERRED: retained logs support provider S3 failure, not a demonstrated One cancellation violation; docs/android-fixture-failures.md records timestamps, Android contract and disconfirming evidence.

Android proof run 39400279121 is in progress at exact HEAD 74b9f9c687c3838faaf76a39a703a6382472ddc2: https://github.com/onejs/one/actions/runs/39400279121. Worker hands review and CI outcome follow-up to p98336 and frees slot. Handoff/evidence retained outside removed worktree: /Volumes/Samsung-1TB-990/task-evidence/one-android-fixture-flakes/handoff.md.

Cleanup: tm worktree remove returned kept only by this session processes, with automatic release on exit. Clean/published tree held by s57415 until tm finish exit; no emulator/server/watchers/resources. Handoff records this exact cleanup outcome.

Duplicate of original coordinator task t-mvgh0z4q-tl40 in Contrast lane, discovered by finish cross-project ownership check. Original task now carries PR/proof handoff and p98336 owns it.
