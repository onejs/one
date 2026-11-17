---
id: t-mv3hjxnz-1q9c0
title: Prepare current One v2 stable release candidate
status: done
owner_status:
  state: landed
  text: release candidate prepared and CI green; stable delivery awaits Nate in launch lane
  updated_at: 1791710484582
assignees:
- s30391
labels:
- branch:v2-beta
- lane:one-v2-release
- umbrella:plans/contrast/mobile-app/one-v2-launch.md
backend: git
created_at: 1791702744623
updated_at: 1791710484612
field_marks:
  active_form: 1791702744623
  body: 1791710484612
  claim: 1791702744623
  evidence_summary: 1791702744623
  owner_status: 1791710484612
  parent: 1791702744623
  priority: 1791702744623
  recovery_ref: 1791702744623
  status: 1791710484585
  title: 1791702744623
---
2026-10-11 owner report: investigating Checks 38106657255 at 006006007; will fix v2-beta, refresh PR 795 without force push, verify major dry-run tarballs, and update scaffold docs. Own v2-beta CI watch. Main, stable 2.6.0 publication, PR merge and blog publication stay held for Nate.

2026-10-11 RAN: TS6307 reproduced locally; TESTED c35ec6e60 fixes project boundary and preserves all six Metro integration tests, pushed v2-beta. Public create subcommand approval provenance asked parent: existing CLI only supports npx one [name]; requested npx one create needs new API. Prepared code/docs await this clarification.

2026-10-11 RAN: release version/publish harness 28 tests pass. Saved proposed create command and docs as ~/.team-machine/results/one-v2-readiness-s30391/proposed-create-command.patch, restored only my edits from shared beta while parent confirms API provenance. PR workspace ~/.worktrees/one-v2-readiness created from existing PR head to preserve fast-forward history. No stable or main operation performed.

2026-10-11 parent s27975 corrected assignment: Nate never approved a create subcommand; keep the existing npx one API, no new subcommand. Proposed code was restored and is excluded from beta/PR. CI wait w-1a162c remains active. Current docs site already uses npx one and has no bun create one references.

2026-10-11 RAN: full repository docs search finds only plans/one-native-launch-checklist.md:50 still saying bun create one. All current site scaffolding docs already use npx one; will correct the checklist wording without adding a public API. Existing CI watch remains sole watcher.

2026-10-11 RAN: docs wording corrected and pushed as 3216f87b2; no create subcommand or proposal remains. Current site docs already used npx one. Exact-tip Checks manually dispatched because Markdown-only pushes are ignored: 38121489066. Will replace c35 CI watcher with the exact final tip watcher; no duplicate watch.

2026-10-11 owner report: waiting for Checks 38121489066 on exact current v2-beta 3216f87b2. Preparation complete: local 37-workspace types and 28 release tests pass; public 24-package tarball verifier prepared outside repo. PR refresh and dry run proceed after this CI verdict. Stable publication, PR merge, One main and draft flip remain held.

2026-10-11 RAN: exact-tip Checks and Tests 38121489066 completed success at 3216f87b2 (watch w-03d167). Moving to PR refresh and major dry-run artifact verification. CI owner remains this session.

2026-10-11 RAN: PR source assembly 5bd4efbe6 tree equals v2-beta 3216f87b2 exactly; PR history stays fast-forwardable from 36382eb3a. Major dry run running with --ci --skip-tests, retaining audit, frozen install and package build; full exact-source CI already passed. Blog remains draft.

2026-10-11 RAN: major dry run passed audit and 21 build tasks, selected 2.6.0; 66 manifests have version-only changes. Tarball target verification rejects real defects in emitter CommonJS export, HMR subpaths and URL/test fixture types. Fixing these existing package manifests on v2-beta, with CommonJS emitter behavior and export-target regression tests, before refreshing stable PR again. Initial source/version commits remain isolated and unpushed; no stable/main operation.

2026-10-11 TESTED: package export regression rejects original manifests (5 failures, 1 pass) and passes all six after correction; CommonJS emitter delivers and disposes listeners. One types, 16 build tasks, frozen install and scoped lint/format pass. Packaging fix pushed to v2-beta; exact source CI watch required before final PR refresh and dry-run tarballs.

2026-10-11 RAN: Checks 38123271943 rejected missing @vxrn/emitter dev dependency in new regression test; test job passed. Adding the explicit workspace test dependency and rerunning depcheck plus regression suite. No assertion relaxation or dependency-ignore suppression.

RAN: da25c4ab1 adds the missing emitter test dev dependency; One depcheck reports no issue and all six export tests pass. Pushed v2-beta. Refreshed PR source tree equals this tip exactly, saved on tm/one-v2-readiness-final; existing PR has not yet changed. Build admission was full, so the final dry run resumes after exact-beta CI. Pending delivery: full beta Checks, final dry run and 24 tarball receipts, fast-forward PR update; stable/main/blog steps stay held for Nate.

RAN: exact-beta Checks and Tests 38124898110 passed on da25c4ab1c10a5cdec91febeb2bd2458dfbd394c (wait w-107ccd). Resuming final major dry run, all 24 tarball checks, and fast-forward PR 795 refresh. Own candidate CI watch; stable publish/main/blog remain held.

RAN: final major dry run passed audit, frozen installation and 21 builds; all 66 manifest changes are release versions only. Verified all 24 npm tarballs with source/byte/internal-version/export/CLI checks; receipts ~/.team-machine/results/one-v2-readiness-s30391/artifacts-verified/tarball-receipts.json. PR 795 fast-forwarded without force from 36382eb3a to f1a411ac5902f79321782af92d838cc9ac487d69 and body refreshed; GitHub reports MERGEABLE. Pending PR Checks 38126588617 and Android Native Build 38126588598, owned here. Contrast plans pushed at 71304bcb8ae (docs only, diff check passed); ci-fleet r68679 owns Contrast follow-up. Retained worktree ~/.worktrees/one-v2-readiness only until candidate CI terminal, live owner s30391; all source commits pushed and evidence outside tree. Guard cwd defect t-mv3lbzfk-220z0 is filed, explicit git -C resolved it and it is not blocking now. Pending Nate: publish 2.6.0, merge #795/change One main, undraft/deploy blog.

Correction: Contrast 71304bcb8ae was committed, but its push was rejected by the pre-push remote-tip check. Syncing the moving remote and retrying; do not treat that plan commit as delivered until push success is recorded.

RAN: Contrast plan delivery succeeded at 66874cc833c0c8e087d08b113b139fcc45192fb2, preserving the incoming shared main commit via a disjoint merge. The plan change itself is 71304bcb8ae, focused validation git diff --check passed. Contrast CI owner remains ci-fleet r68679; docs only, no production change. All authorized preparation is pushed. Own one aggregate watcher for the exact candidate f1a411ac5902f79321782af92d838cc9ac487d69: Checks and Tests 38126588617 and Android Native Build 38126588598. Final cleanup and handoff follow terminal CI. Stable publish/main/merge/blog remain pending Nate.

RAN: candidate Checks and Tests 38126588617 and Android Native Build 38126588598 passed (w-d052e7 ALL GREEN). Final launch plan verdict pushed at Contrast 8093ae6938d414d276f595fcf9b3298b22bca02b; focused diff check passed, Contrast CI owner ci-fleet r68679. Owned worktree removed via tm worktree remove; evidence and cache preserved under ~/.team-machine/results/one-v2-readiness-s30391. No active watchers, spawned helpers or owned services. Readiness complete. Pending delivery belongs to launch lane s27975 after Nate authorizes: publish 2.6.0, merge #795/change One main, undraft/deploy blog. Handoff: ~/.team-machine/results/one-v2-readiness-s30391/handoff.md.
