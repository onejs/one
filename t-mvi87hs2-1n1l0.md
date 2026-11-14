---
id: t-mvi87hs2-1n1l0
title: Review PR 998 cold-route and same-screen delta
status: done
assignees:
- m50768
labels:
- lane:router-replace
- umbrella:one
parent_id: t-mvi4nv4p-rhj0
backend: git
created_at: 1792594040258
updated_at: 1792594111909
field_marks:
  active_form: 1792594040258
  body: 1792594111909
  claim: 1792594040258
  evidence_summary: 1792594040258
  owner_status: 1792594040258
  parent: 1792594040258
  priority: 1792594040258
  recovery_ref: 1792594040258
  status: 1792594111909
  title: 1792594040258
---
Review only b695163cbb..b915d0de69e on Studio, run disposable focused probe if cheap, report to m50170 and r110538, finish. No heavy validation or animation work in this assignment.

Assignment: review only PR 998 delta b695163cbb..b915d0de69e1767516b519d92582928bcdaa9cc6. The newer assignment supersedes runtime capture work; parent task already records capture as passed by its owner.

Verdict: APPROVED. No regression found in the two-file delta. No edits or pushes.

READ: exact diff and surrounding linkTo route validation/suspension, action construction and resetRoot dispatch; complete new helper and useViteRoutes preload handling; focused cold-route test expectations. isColdRoute is local to each linkTo invocation and only changes the native REPLACE action choice after a thrown load/validation suspension promise. Warm routes retain stack replace. Cold replacements retain resetRoot, including after waiting for load in other modes. Non-REPLACE actions and web routing are unchanged. The new helper predicate excludes same-name/same-instance replacements, while differing sibling names and changed dynamic params remain eligible. Existing route-group and tab guards still apply. The delta introduces no second payload/traversal implementation; no additional simplification owed.

TESTED on studio-64: disposable StackRouter/TabRouter probe against exact git-show source b915d0de69e passes 14/14 (original 12 plus same-leaf changed-query and same-dynamic-instance changed-query reset controls). This includes leaf->nested sibling payload, dynamic project param switch, correct source/target stack keys, history/params, groups both directions, tabs, nested stack within focused tab, unknown routes and explicit target index.

Evidence on studio-64: ~/.team-machine/evidence/pr998-delta-m50768/probe.ts, probe-after.json and reviewed-router exact source. Helper SHA256 8db1d45e5310870eb3344284707e080349a157ddc9e4b20a3807acf8022e37d7.

RAN no heavy commands, builds, browser, installs or full tests. The author's reported router suite (120 pass, 2 skips) was not independently rerun; cold linkTo path was source-reviewed, not exercised by this helper probe. No new animation validation claimed. No worktree or service created for delta review; only disposable source/probe evidence retained. CI/canary owner remains p96184.
