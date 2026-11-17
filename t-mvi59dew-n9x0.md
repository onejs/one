---
id: t-mvi59dew-n9x0
title: Review PR 998 and capture Contrast project replace motion
status: done
owner_status:
  state: landed
  text: capture passed, PR 998 qualified
  updated_at: 1792593147506
assignees:
- m50170
- r115322
labels:
- lane:router-replace
- umbrella:one
parent_id: t-mvi4nv4p-rhj0
backend: git
sessions:
- m50789
commits:
- b695163cbb60f0f3086ecd33dd6c8f603b12ff8b
created_at: 1792589089064
updated_at: 1792593147506
field_marks:
  active_form: 1792589089064
  assigned:m50170: 1792591099580
  assigned:m50768: 1792589845395
  assigned:m50789: 1792590010694
  assigned:r115322: 1792591171798
  body: 1792591062509
  claim: 1792591099581
  claim_current:99a7e8608d1cca598137fab39b56733f: 1792591099581
  claim_state:5a148223e607afa4ccad46de95e34c2d:1792590088909:=m50789:=mc-2tabg3bdr1roz:1792590088909:f: 1792590088909
  claim_state:99a7e8608d1cca598137fab39b56733f:1792591099581:~:~:~:o:5a148223e607afa4ccad46de95e34c2d: 1792591099581
  commit_linked:b695163cbb60f0f3086ecd33dd6c8f603b12ff8b: 1792589750665
  evidence_summary: 1792589089064
  owner_status: 1792593147506
  parent: 1792589089064
  priority: 1792589089064
  recovery_ref: 1792589089064
  status: 1792593147506
  title: 1792589089064
  unassigned:m50170: 1792589845395
  unassigned:m50768: 1792590004409
  unassigned:m50789: 1792591099580
---
Review source e2a81ca910 and disposable StackRouter probe, fix small defects on tm/sibling-stack-replace, then run actual Contrast mobile project picker on compatible local Peach engine and capture motion. No merge, stable release, helpers or canary pin work; ci-manager p96184 owns pin.

TESTED disposable StackRouter probe at ~/.team-machine/evidence/pr998-m50768/probe.ts: source e2a81ca910 incorrectly dispatches stack replace for leaf-to-group and group-to-leaf paths (two failures). Fixed group guard in b695163cbb and removed redundant child-state checks; all 12 cases pass. TESTED getNavigateAction 7/7, scoped lint/format/diff checks pass. RAN pushed b695163cbb to tm/sibling-stack-replace; 17 package local release into air-32 ~/contrast succeeds. CI owner remains ci-manager/p96184; no canary or pin duplicated.

RAN current engine build to isolated Contrast scripts/tmp/pr998-m50768 outputs. TESTED it still reports multipart JavaScript MIME failure because the actual guest bundle fails compilation: co-tenant uncommitted DesignTabScreen.tsx imports DrawStroke twice (lines 9 and 24). Direct bundle GET is HTTP 500 text/plain with exact duplicate-identifier error (saved bundle-response.txt/headers). Preserved co-tenant edits and moved validation to a clean Contrast worktree at a393164ae7c. Engine build has existing text/javascript support verified in tenant-worker chunks; this error is masking compile failure, not solely old engine MIME handling.

TESTED code review is approved after pushed b695163cbb. Runtime animation is NOT validated. Current engine build accepted source text/javascript support but primary app compilation failed due to co-tenant duplicate DrawStroke import. A clean Contrast worktree at a393164ae7c was prepared and compiler started; load-governor then paused owned Playwright host PID 53022 at 0.9% host idle. Exact ready condition timed out while sim was unreachable. No retries, assertion relaxation, engine patches, merge, stable release, or helper agents. Closed owned sim and stopping mobile/shell/watchers. Retaining isolated built engine outputs and runtime package install for landing-lead m50170 pickup; source/hashes and reports at ~/.team-machine/evidence/pr998-m50768.

Cleanup verified: both One and Contrast validation worktrees removed by tm worktree remove, retired to managed trash for admitted sweep. Owned listeners 4668/5441/7936/9338 are gone; owned staleness watchers terminated. Probe and exact reviewed helper sources copied outside worktrees; replayed retained probe successfully (12/12). Handoff ~/.team-machine/evidence/pr998-m50768/handoff.md (under 4KB); engine outputs and local upstream install retained with live owner m50170.

Team Machine moved this task to m50170: every assignee (m50768) had ended.

Goal: capture Contrast mobile project picker switching projects with PR 998, reviewed head b695163cbb. Verdict: BLOCKED BEFORE MOUNT; project switch animation NOT VALIDATED. No PR changes, merge, publish, production login or production data mutation.

RAN Studio placement after busiest initial CPU sample 51.60% idle, 24GB unused RAM; pro-128 initial sample 0.51% idle, rejected. `machine-health.ts` recorded Studio state. Clean managed origin/main worktree /Volumes/Samsung-1TB-990/worktrees/contrast-pr998-capture, HEAD 7969d01f72c63e27a69b7a9c5bb61b8b645d4f7d; primary co-tenant edit untouched. Retained air-32 engine and tenant builds copied into Studio evidence runtime/. Reviewed installed One copied into isolated worktree, router+helper hashes match m50768 runtime-sha256.txt exactly.

TESTED isolated local app/backend/shell and fixture seeding succeeded. Mobile bundle compiled, direct request HTTP 200 text/javascript, 35,707,144 bytes, SHA256 4798dd7df730be4d789f5411ea3627df35caa3f3a9e67c2c5cfe268a50fcc635; contains getNativeStackReplaceAction. This excludes the earlier primary checkout HTTP500 compilation failure for this attempt. Evidence bundle-proof.json, mobile.log.

RAN Peach Playwright native host DSF3, iphone-16-pro, fresh named profile pr998-m50789, sim 081db713-554a-43c9-8f23-ffa7e4a98a0a. Host receipt reports pid60655 code0 completedAt1792590829167; driver log explicitly reports `[page] renderer crashed; closing playwright host` after engine/render worker startup. CLI subsequently reports disconnected sim and host already exited. No guest UI mounted, no picker interaction, no animation frames or video. Driver log and .completed receipt retained as peach-playwright-host-mvi6adwi-57910.log*. Code0 is the host wrapper cleanup status, not successful rendering.

INFERRED load/memory pressure may be involved: later busiest sample 0.87% idle, 63GB used, 79MB unused, 20GB compressor (later saved load-after.txt). This is correlation; renderer crash mechanism is unknown without a crash report or lower-load replay. No relevant Chromium crash report found in latest DiagnosticReports listing. A successful lower-load replay would disprove persistent engine incompatibility; an engine error before crash could identify another cause.

Evidence mirrored on air-32 at ~/.team-machine/evidence/pr998-m50789 and on studio-64 at the same path. Private local fixture credentials remain Studio-only fixture-private.json. No source changes or commits; final-source-status.txt empty. Owned services stopped and listeners verified gone (3388/4788/5561/8056/8237/9389/9888-9892). Cleanup of managed shell/worktree is being finalized. Parent m50170 owns next placement/capture attempt; CI owner unchanged p96184. Earlier retained engine/install resources remain owned by m50170.

Cleanup confirmed: owned native host already exited, stack supervisor/backend/app/shell/mobile stopped, staleness PID45713 stopped, no owned listeners remain. tm stop s63493 released the clean managed worktree; git worktree list no longer lists pr998-capture. No changes to PR 998. Capture remains blocked before mount, not a failed animation assertion.
