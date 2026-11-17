---
id: t-mv9lmx6l-1yho0
title: Fix One bound-control set(get()) race that overwrites newer native values
status: done
owner_status:
  state: landed
  text: branch-only fix 197a30db3 pushed; all 45 sync tests, codegen check, package typecheck pass; parent owns review
  updated_at: 1792074415005
assignees:
- s42766
labels:
- branch:oss-fixer/one-bound-race
- lane:one-bound-race
- oss-fixer
- umbrella:oss-fixer
backend: git
sessions:
- s42766
commits:
- 197a30db3
- 8c67866cb
created_at: 1792072399485
updated_at: 1792081738588
field_marks:
  active_form: 1792072399485
  assigned:s42766: 1792072427206
  body: 1792074457691
  claim: 1792074504239
  commit_linked:197a30db3: 1792074414210
  commit_linked:8c67866cb: 1792074414289
  evidence_summary: 1792072399485
  owner_status: 1792074415006
  parent: 1792072399485
  priority: 1792072399485
  recovery_ref: 1792072399485
  status: 1792081738588
  title: 1792072399485
---
RAN: read #899 and syncStore.ts; added deterministic component regressions for Compose and generated text controls. Heavy admission currently refused due to a waiting quiet window; dependency links and local codegen cache prepared. Owner: oss-one-bound-race.

Regression coverage includes Compose TextField and generated TextField, SecureField, TextEditor, Toggle, Slider, and Stepper. Local admission refused; portable red-test probe dispatched through tm to beast. No runtime fix applied before the red test.

RAN: first remote probe executed the root package script despite caller cwd packages/one, so it failed before tests. Filed tm-defect t-mv9lug5m-dnt0. Retrying portable command with explicit bun --cwd packages/one. Local admission remains refused by a quiet window waiting behind 4 running heavy windows.

Savepoint 8c67866cb on oss-fixer/one-bound-race (tests only, Validation: none). Main sync includes e0cceb3b2. Prepared runtime patch /tmp/one-bound-race-fix.patch remains unapplied until red probe. Next: read detached test result, confirm expected interleaving failures, apply patch, regenerate, run all sync tests + generate:check + package typecheck, commit fix, push. CI owner: ci-manager. No device validation yet.

RAN: wait w-0397e0 ran the probe before repair, 7 failed, 18 skipped (filter excluded existing tests). Text controls expected pas but received pa; scalar controls likewise rolled back. Full red log /tmp/one-bound-race-red.log. Observation: native advances inside the first host.get result, and handler set(get()) overwrites it.

RAN: applied the runtime fix after seven deterministic pre-fix failures. Internal WeakMap publication reads the host and invokes existing subscriber publication without calling state.set or host.set; public SyncState stays unchanged. Compose and control generator now use this path. Generation and all validation are queued behind resource admission.

RAN: pre-fix filtered regression run failed 7/7 (text expected pas received pa, boolean false received true, numbers 2 received 1). After repair: Test Files 5 passed (5), Tests 45 passed (45). RAN: generate and generate:check passed on SwiftUI SDK 27.0 with 369 generated files verified and controlled-state verification passed; tsc --noEmit exited 0. RAN: branch oss-fixer/one-bound-race pushed at 197a30db3; no PR/main merge/push. INFERRED: internal read-only callback removes the read/set native overwrite path; regression host.set spies record zero JS writes during both interleaved and subsequent events, which would fail if the overwrite remained. Unproven: physical-device/native-runtime reproduction and performance. CI owner: ci-manager; expected workflows checks/tests on branch pushes. Parent p86518 owns review and next PR step. Evidence: /tmp/one-bound-race-red.log, /tmp/one-bound-race-green.log, /tmp/one-bound-race-codegen-check.log, /tmp/one-bound-race-typecheck.log.

Cleanup RAN: worktree clean, local/remote fix SHA equal. tm worktree remove returned kept because only this session own processes hold it; auto-release on session exit. Retained /Volumes/Studio-Ext/worktrees/one-bound-race owner s42766 until exit. No owned servers/simulators or active waits. Final handoff /tmp/one-bound-race-handoff.md.
