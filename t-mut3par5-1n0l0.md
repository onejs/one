---
id: t-mut3par5-1n0l0
title: Pager per-frame values feed Reanimated worklets
status: done
labels:
- lane:one-native-pager-reanimated
- umbrella:plans/one-native-launch.md
backend: git
created_at: 1791074818481
updated_at: 1791091772139
field_marks:
  active_form: 1791074818481
  body: 1791074818481
  claim: 1791074818481
  evidence_summary: 1791074818481
  parent: 1791074818481
  priority: 1791074818481
  recovery_ref: 1791074818481
  status: 1791091772101
  title: 1791074818481
---
Status: in progress. Landed on v2-beta: 4c7a592ff (compiler forwards method-signature native command args; Pager setPage was a no-op under One's bundler), 475640b6f (Pager getAnimatableRef so createAnimatedComponent + useEvent onPageScroll run on UI thread). Proofs RAN: Android emulator + web via tests/native-features/scripts/pager-worklets-proof.ts. Pending: iOS 27 sim (pool at cap, queued), docs + test harness commit, handoff.
