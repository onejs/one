---
id: t-mvkdtqrf-1v4o0
title: Repair PR1016 SDK bundle build scope without weakening deterministic proof
status: done
owner_status:
  state: landed
  text: focused SDK build scope fix pushed; parent p103481 review and CI p103700 remaining
  updated_at: 1792724587107
assignees:
- p103481
labels:
- lane:beast-gate
parent_id: t-mvk3ej0l-iwp0
backend: git
sessions:
- m53214
commits:
- ffcb3074ef830df4003fddb2d6d03def1760e787
created_at: 1792724408763
updated_at: 1792724640333
field_marks:
  active_form: 1792724408763
  body: 1792724626887
  claim: 1792724640333
  claim_current:bc13e08eea517423afd06c6f9015911f: 1792724640333
  claim_state:59b5ea3dbc450212a5f44567bb6641d6:1792724448052:=m53214:=mc-2tabg3bdr1roz:1792724448052:f: 1792724448052
  claim_state:bc13e08eea517423afd06c6f9015911f:1792724640333:~:~:~:o:59b5ea3dbc450212a5f44567bb6641d6: 1792724640333
  commit_linked:ffcb3074ef830df4003fddb2d6d03def1760e787: 1792724586706
  evidence_summary: 1792724408763
  owner_status: 1792724587107
  parent: 1792724408763
  priority: 1792724408763
  recovery_ref: 1792724408763
  status: 1792724640333
  title: 1792724408763
  unassigned:m53214: 1792724640333
---
Existing Contrast acceptance plan plans/contrast/milestones/one-ios-complete-coverage.md and release task t-mvk3ej0l-iwp0. PR1016 exact d0a630f6 has one required Tests failure: sdk-fingerprint.test.ts113 deterministic standalone bundle timeout5000ms. Parent read actual build/test sources: custom SDK outdir CLI now unconditionally also transforms all290 native facades into checkout dist, called twice by failing SDK-only test and once by sdk-app-contract. Source-qualified unrelated work/side effect; measured timeout attribution not established. Preserve generator fingerprint/native outputs, production full build, all existing deterministic/standalone assertions/deadlines; no timeout/retry weakening. Focused minimal correction plus actual before/after build scope and existing affected-suite proof. Original author103857 finished, no live overlapping source author established. Parent103481 existing review/serial release, CI103700 required upstream checks; no stable dispatch/native generation.

TESTED at ffcb3074ef on original PR1016 branch tm/ios-export-resolution, directly atop d0a630f6f932260070c1aaf445663142dd8a9aaa with original history preserved. Custom-output CLI before created 290 checkout facade outputs; after rewrites zero. No-argument package CLI still compiles 290; all per-file hashes match old output and SDK bundle bytes match across all three commands. Existing affected suites run once through package test script under normal heavy admission: 2 files, 9 tests passed. No assertion, deadline, isolation, fingerprint input or native generation changes. Evidence: /Users/n8/one/.team-machine/evidence/m53214-sdk-build-scope. Local Bun 1.4.2, Vitest 4.1.12 with existing primary dependencies linked read-only. INFERRED: extraneous scope removed; observed local timing does not establish failed CI timeout causality. Expected upstream required workflows triggered by branch push; p103700 owns broader checks, p103481 review and release task t-mvk3ej0l-iwp0 retain publication conditions. No publish, native generation, consumer install, dispatch or full-family build performed.

Cleanup: tm worktree remove returned kept only by this session own processes, explicitly released on session exit. Clean pushed worktree retained until m53214 exits; durable handoff/evidence outside it. No owned services, watchers, children or windows remain.
