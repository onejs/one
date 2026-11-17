---
id: t-mvgiyfjr-139n0
title: Sequence Android state input after editor readiness
status: done
owner_status:
  state: needs
  text: p98336 review PR985 and exact-HEAD Android proof 39406745662
  updated_at: 1792491423910
assignees:
- p98336
labels:
- lane:one-peach-contrast-e2e
- one-android-state
backend: git
sessions:
- s57415
commits:
- e77f1d9c406b8edc8625b122249e341e790ae28a
created_at: 1792491160887
updated_at: 1792493994417
field_marks:
  active_form: 1792491160887
  assigned:p98336: 1792491423910
  body: 1792493994417
  claim: 1792491160887
  commit_linked:e77f1d9c406b8edc8625b122249e341e790ae28a: 1792491386620
  evidence_summary: 1792491160887
  owner_status: 1792491423910
  parent: 1792491160887
  priority: 1792491160887
  recovery_ref: 1792491160887
  status: 1792493994417
  title: 1792491160887
  unassigned:s57415: 1792491423910
---
Assigned by p98336: investigate run 39400684794 platform/state failure, preserve strong shared field/hook assertions, One PR natural Android proof, reviewer p98336, CI owner p96184. Captures downloaded under /Volumes/Samsung-1TB-990/task-evidence/one-android-state-s57415. Failure XML shows gace in primary, shared and hook, so propagation converged; source injects grace 45ms after tap before input connection begins. Further cause validation in progress.

TESTED capture: 03-failure.xml primary/shared/hook/getter all equal gace; independent remains untouched. RAN log: input tap at 09:53:01.527; input text grace at .572; IME onStartInputView still inputType=0 at .593; real editor onStartInput at .852, restarted at .946, inactive InputConnection warning at .980. INFERRED fixture injected during asynchronous editor handoff, not demonstrated state propagation failure. Proposed wait: primary focus plus current-client active, not connecting, app package, nonzero editor input type and live served input connection before typing. Added primary exact grace assertion; existing shared/hook/isolation assertions unchanged. Saved-dump runtime probe accepts recorded active client and rejects non-editor/connecting/inactive/other-app/missing/retired/history-only states. Disconfirming case: complete ready-editor injection still loses chars; native editing investigation then needed.

PR985 pushed at e77f1d9c406b8edc8625b122249e341e790ae28a: https://github.com/onejs/one/pull/985. Natural Android proof https://github.com/onejs/one/actions/runs/39406745662 in progress at exact HEAD. TESTED seven existing snapshot checks importing revised runner, saved-dump readiness acceptance plus seven rejection controls, focused repository-configured oxlint, Bun syntax build and isolated-index diff check pass. No device validation yet; p98336 owns review/delivery and p96184 CI follow-up. No runtime source change, retries, timeout increase or assertion weakening. Native-ready check precedes single text injection; new primary grace assertion distinguishes incomplete edits from propagation. Source/evidence outside checkout at /Volumes/Samsung-1TB-990/task-evidence/one-android-state-s57415; no new worktree, processes or claims.

Merged onejs/one#985 as d496c1767b4 after green Android run 39406745662.
