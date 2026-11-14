---
id: t-mvfjzb1k-xhp0
title: Repair numeric record serialization before generator integration
status: done
labels:
- ios-interface-generation
- one
parent_id: t-mvfhwbnq-7a90
backend: git
sessions:
- m46593
commits:
- 2bf7125d76bbe7f426dadb87a9297d3f04544243
created_at: 1792432415144
updated_at: 1792434322059
field_marks:
  active_form: 1792432415144
  body: 1792434322059
  claim: 1792434113851
  claim_current:79b10e3fa909d61171e75a9378572406: 1792434113851
  claim_state:27e1c3ceee91cb9f7e31859a148aefe1:1792432534395:=m46593:=mc-2tabg3bdr1roz:1792432534395:f: 1792432534395
  claim_state:79b10e3fa909d61171e75a9378572406:1792434113851:~:~:~:o:27e1c3ceee91cb9f7e31859a148aefe1: 1792434113851
  commit_linked:2bf7125d76bbe7f426dadb87a9297d3f04544243: 1792433974784
  evidence_summary: 1792432415144
  owner_status: 1792432415144
  parent: 1792432415144
  priority: 1792432415144
  recovery_ref: 1792432415144
  status: 1792433974950
  title: 1792432415144
---
Lead peer review of a0cb6039c2 found a concrete serialized numeric-record boundary violation. Existing 13 range controls pass, but class {lower=1;upper=5;toJSON(){return {lower:5,upper:1}}} emits reversed bounds to native instead of rejecting. Fix canonical numeric record serialization for range/tuple/struct consistently, retain scalar and omission behavior, deliver an isolated candidate. User approved UI generation acceleration and Spark helpers on2026-10-19. Shared release generator files currently have Opus gesture WIP; preserve it. Lead p95796 owns peer review/CI, s51006 native app proofs.

Placement: Pro128 busiest-sample CPU10%idle, so used nearby Pro64 with fresh policy dry-run Spark contributor max. Actual launch definitively refused before launch for missing load sample, recommending Air32. Canonical alternate Air32 attempt now pending, same task/slug, no duplicate confirmed worker. Normal resource admission applies to focused generation/checks; no app builder.

TESTED peer review p95796 canonical repair2bf: actual generated encoder ordinary/scalar/partial controls and serialized toJSON reversed/null/array/undefined/extra-field negatives all PASS, single serialization verified. Integration with a0cb and current gestures/value factories pending source overlap: Opus native-drag WIP in emitStyle/emitControls preserved; lead preparing fixture/docs in nonoverlapping paths. No 290 producer required.
