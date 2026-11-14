---
id: t-mv639ta3-vds0
title: Finish Basic starter web and iOS acceptance
status: done
owner_status:
  state: needs
  text: acceptance report complete; 2.6.4 production/install/types pass, dev/native release gaps persist; s36005 owns merges, CI and artifact verification
  updated_at: 1791863795683
assignees:
- s36005
labels:
- branch:fix/prebuild-ios-codegen
- lane:verify-basic
- umbrella:one-v2
backend: git
created_at: 1791860156283
updated_at: 1791887392803
field_marks:
  active_form: 1791860156283
  assigned:s36005: 1791863795684
  body: 1791863795684
  claim: 1791860156283
  evidence_summary: 1791860156283
  owner_status: 1791863795684
  parent: 1791860156283
  priority: 1791860156283
  recovery_ref: 1791860156283
  status: 1791887392753
  title: 1791860156283
  unassigned:r89482: 1791863795684
---
Worker verification complete: ~/.team-machine/briefs/one-v2/verify-basic.md and verify-basic-evidence.md. TESTED: fresh 2.6.4 npm/Bun install and typechecks; all seven production routes, client navigation, zero browser errors. Latest dev tabs fail No filename found; native prebuild fails missing ReactAppDependencyProvider. Source-patched 2.6.2 passes dev/HMR and iOS27 compile/launch, native HMR retained state, back navigation, widget/activity controls. Source-patched full prebuild passes without Android SDK variables. Pushed PRs: #820 c14d1c505 (native Stack), #823 a9a0d6f0d (unvisited-route HMR, 12 focused tests), #824 0b18b972f (cancel install). #811 still open; #808/#813/#815 merged; #812 closed superseded. CI and delivery owner s36005: merge pending PRs, required source checks/builds, release then verify tarball/source content and onboarding. No main merge or publish by worker. Simulator and owned servers released/stopped. Evidence/source preserved outside worktree.
