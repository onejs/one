---
id: t-mvbphz05-1ky80
title: Preserve URL fragments in One initial navigation state
status: canceled
owner_status:
  state: needs
  text: normal PR auto merge waits required tests timeout; ci-manager owns CI; s47560 owns sole release cut
  updated_at: 1792205954932
assignees:
- r92208
labels:
- branch:fix/initial-location-fragment
- branch:fix/initial-location-fragment-r92208
- lane:one27-initial-fragment
- umbrella:plans/contrast/one-navigation-upgrade.md
priority: 3
backend: git
created_at: 1792199819381
updated_at: 1793089895444
field_marks:
  active_form: 1792199819381
  body: 1793089895444
  claim: 1792199819381
  evidence_summary: 1792199819381
  owner_status: 1792205954932
  parent: 1792199819381
  priority: 1792199819381
  recovery_ref: 1792199819381
  status: 1793089895444
  title: 1792199819381
---
Scoped upstream blocker in Contrast acceptance t-mv7sbq1k-14fl0 and preview acceptance t-mvbnqwua-lvm0, reported by r93796. Inspect actual One setupLinking/getSSRInitialState and temporary browser location; reproduce initial URL fragment loss with existing real parser/router tests, fix at owning upstream source, preserve query-only/native cold-start behavior and SSR cache separation. Prepare normal isolated branch/PR; no One main merge, stable dispatch, Contrast dependency shim, mounted preview producer, tester retry or new reviewer. ci-manager owns CI; upstream merge/release remains parent oss-fixer after assigned independent review. Original recording-parser probe SHA256 6c22352e7020f410faf91cd8d5a2c8c7ea34400b682c65f8944522269e82723c is source-input proof only, no mounted causal claim.

RAN fresh managed Studio tree /Users/n8/.worktrees/one-initial-fragment-r92208 from origin/main9435b113ae773ceebeef9e0a7144d5401b2c986f, normal frozen install1966packages; primary preserved. Original input probe bytes independently hash/size-verified2166/6c22352 and preserved in E/team/upstream-fragment; adapted copy changes only source filename, records omission/candidate forward without mounted claim. New existing linkingConfig test guard failed10/passed5 with actual nested parser, SSR cache reuse, temporary history and actual useLinking hook initialized through React server renderer. Fix adds hash at four initial-path reads in linkingConfig/useLinking, no new helper/API/dependency/default. RAN after:7files58pass/3pre-existing skips; all15 linkingConfig cases pass, query-only/native incoming controls retained. Exact existing skips are getPathFromState search params and two getStateFromPath dynamic-group cases, untouched. Source-before initial cold attempt blocked missing utility workspace JS; built only that prerequisite, preserved both logs. Current own package build/lint awaiting normal Studio quiet boundary; no preview producer, tester retry, native execution, upstream merge/release or full Contrast row credit.

RAN focused upstream fragment fix is pushed: One PR941 https://github.com/onejs/one/pull/941, branch fix/initial-location-fragment-r92208, source0e7c63e297e10fe994cd9056fcfe5ef9eae7ac92 from main9435b113. Real One parser and actual browser useLinking hook (React server renderer, no mounted preview) reproduced10fail/5pass before; afterward all15 initialization cases and58 tests across7files PASS, with3 pre-existing untouched skips. One JS build, full package tsc --noEmit, focused formatter/oxlint PASS. Repair forwards hash at setupLinking/SSR and both masked-history reads; SSR cache now separates hashes, query-only/encoded query/clearing/fresh native incoming controls retained. Original2166byte input probe preserved hash6c22352; all proof E/team/upstream-fragment. No Contrast shim/package/fixture/native producer/tester retry or merge/publish. INFERRED this fixes the reproduced One initial-state loss; shared guest hash remains unqualified until the existing acceptance owner consumes a reviewed artifact. Needs existing upstream owner to assign substantive independent review and carry normal merge/release; I spawned no reviewer and am proceeding with the separate approved role delivery repair.

RAN assigned independent Opus reviewer s47560 APPROVE on PR941 source0e7c63e297e10fe994cd9056fcfe5ef9eae7ac92, comment6228431920; reviewer reports29files207passed/56existing skips. Normal author gh pr merge --auto --squash --match-head-commit0e7c63e exited0; readback confirms OPEN, autoMergeRequest SQUASH enabled, mergeStateStatus BLOCKED, no containing merge or release artifact yet. Required Checks and Tests run38992268894 tests red: vxrn src/config/ssrVendorOptimization.test.ts renders with shared React through patched entrypoints:false timed out5000ms (337pass/1fail); checks and Android compile/all fixture groups green. INFERRED unrelated timing failure from unchanged vxrn path and timeout, not baseline-attributed; a same-source deterministic behavior failure would contradict that inference. ci-manager owns CI attribution/rerun, no author rerun or wait. Exact failed log archived pr-ci-failed.log. Nonblocking reviewer notes retained: client fragment/server absence may affect hydration when rendered params include hash (not mounted-reproduced); optional URL fields can simplify later. Current fix remains scoped to initial-state fragment transport. s47560 owns sole2.8.1cut and Nate release decision; no second publisher. Preview owner r93796 needs actual containing artifact before consuming, no shared guest/hash acceptance claim.

RAN routerp91951 exactCI38992268894 source0e7c63e297e10fe994cd9056fcfe5ef9eae7ac92 testsjob117277024640 singlefailedjob retryaccepted ghcommandexit0; allowanceconsumed/no secondunchangedretry. RELAYED retainedssrVendorOptimization unpatchedentrypointcase5000ms337pass1fail, INFERREDpossibletimingflake notbaselineattributed. RequiredCIred notclosedfromlocalpasses, actualmerge/2.8.1artifact/sharedguestacceptanceOPEN; existingauthorfailedlogcustody/no routerrefetch/blanketworkflowrerun/manualdispatch/watch/publisher. s47560 solecut/Naterelease decision preserved.

RELAYED ci-manager owner p91951 confirmed exact PR941 run38992268894/source0e7c63e297e10fe994cd9056fcfe5ef9eae7ac92 and accepted one failed-job retry for job117277024640 (gh run rerun --job, exit0). Retry allowance consumed; no second unchanged retry, blanket workflow rerun, dispatch or author watch. Required verdict and actual containing artifact remain OPEN. Existing original pr-ci-failed.log retained unchanged. Timing-flake inference remains unqualified until the required verdict; ci-manager routes recurrence by exact source/environment. Sole2.8.1 publisher/release-decision owner s47560 unchanged.

Team Machine canceled this task: untouched for 7+ days with no live assignee. Reopen with `tm task update t-mvbphz05-1ky80 --status open`.
