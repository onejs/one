---
id: t-mv71xpgs-mz40
title: Repair native rolldown HMR restoration delivery failure
status: done
owner_status:
  state: landed
  text: e95fd042 covering native matrix4/4 success including dev rolldown; HMR acceptance green
  updated_at: 1791990789747
assignees:
- s37966
labels:
- lane:one-ci-owner
- umbrella:one-ci-owner
backend: git
created_at: 1791918378028
updated_at: 1791990789747
field_marks:
  active_form: 1791918378028
  assigned:p84632: 1791918893980
  assigned:s37966: 1791949675292
  body: 1791990789747
  claim: 1791918378028
  evidence_summary: 1791918378028
  owner_status: 1791990789747
  parent: 1791918378028
  priority: 1791918378028
  recovery_ref: 1791918378028
  status: 1791990789747
  title: 1791918378028
  unassigned:p84632: 1791949675292
  unassigned:s37966: 1791918893980
---
RAN failed hosted iOS run 38441117411 source 72ac3540b0fa2d358e1fed46e925eea381509ee0 branch fix/one-native-ios-conformance: dev/rolldown tests/hmr-fast-refresh.test.ios.ts:120 stalls restoring component-v1 after successful hmr-session-ready, route generation remains generation:1. Other three matrix legs and both builds pass. Failed log /tmp/one-ci-owner-38441117411.log (also reported air-32 /tmp/one-zoom-direct-run-failed.log). Parent e56e20d77de65fbd33cc9a92faddfd63d2c6651e iOS run 38423654512 exists, aggregate failed; reported matrix green requires job-level confirmation. Commit changes only two zoom debugger files. HMR cause unproven; no retries, assertion/timeout changes or source edits made. Generated bindings independently fails diagnostics mocks with missing spawn export. Need suitable active HMR repair lane or independent probe on isolated branch. CI verdict tracked t-mv71ecff-1l3d0 by s37966; existing main watcher w-84e29c remains sole verdict watcher.

RAN exact parent run38423654512: all four matrix legs and both builds success, generated bindings failure. Discriminating probe: trace second edit from file-watch event through bundle update and runtime application; a dropped server event differs from delivered-but-unapplied patch. No causal assignment yet.

2026-10-13 coordinator assigned p84632 on pro-128 HMR repair; it will provide PR after focused validation. m30241 reports diagnostics mocks fixed at bb8a35a9ef1a2d9a607d4cb4b35cd3c91827344a, local four tests and independent review passed; hosted iOS successor38447667641 remains pending.

PR #864 (fix/one-hmr-restore, SHA 21bad275e5b284901b1a5051ba46daafc493f77c) opened and green (Checks and Tests: success; Android Native Build: success). Reviewed by p85164 (one-hmr-restore-review, Verdict: APPROVE). Validation (RAN): vitest run packages/vxrn/src/utils/createNativeDevEngine.test.ts packages/vxrn/src/utils/symbolicateNativeStack.test.ts (118 passed); probe-hmr-restore-before-after.mjs before (failed: hmrUpdates=1 childVersion=hmr-session-ready fullBuildCount=2) and after (passed: hmrUpdates=2 childVersion=component-v1 routeEvaluations=1 fullBuildCount=1). Risks: upgrades rolldown 1.2.8->1.2.13 and vite 8.2.2->8.3.4 per Nate's 2026-10-13 direction. Handoff: ~/.team-machine/results/one-hmr-repair.md

RAN PR864 merged52abff1cabb7889c0703639318f5540c13dfbcc4 via authorized oss-fixer lane; CI owner s37966 retains post-merge native HMR acceptance. Starter860 also merged29699cfec6d4ea269e2a05ff47d727b7561bfff4 after refreshed23cc2589 source checks and Android passed. Follow covering main required CI; no stable publishing for these changes.

RAN terminal iOS38546320149: both app builds and all four native matrix jobs success, including dev/rolldown115803718583. HMR acceptance gate satisfied. Overall native delivery remains open separately because generated bindings115803542769 hit hour cap during feature fixtures.

RAN main38559347689 dev/rolldown115836473090 fails hmr-fast-refresh line115 session-ready wait: expected hmr-session-ready, lastseen component-v1; generation1 unchanged. Parent7f81850 matrix4/4 passed. Reopening acceptance on concrete successor failure, not claiming workflow split caused HMR. Job log captured once /tmp/one-ios-dev-rolldown-115836473090.log. Active native owner notified; no blind rerun.

RAN current38572303105 jobs: dev/rolldown success alongside other3 matrix legs, bindings and both builds. HMR acceptance restored on repaired covering source. Overall native delivery waits separate feature fixture job.
