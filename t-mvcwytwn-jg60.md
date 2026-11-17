---
id: t-mvcwytwn-jg60
title: Specialize generated iOS SDK generics
status: done
owner_status:
  state: landed
  text: c8de22d3f pushed; +3766 entries; 289 modules compile clean; zero baseline loss; strict TS and runtime wrong-witness proof pass; ci-manager owns CI, s50803 owns shared tree
  updated_at: 1792273391787
assignees:
- s50797
labels:
- lane:one-sdk-generics
- umbrella:one-ios-coverage
backend: git
sessions:
- s50797
commits:
- c8de22d3f
created_at: 1792272829415
updated_at: 1792273391787
field_marks:
  active_form: 1792272829415
  body: 1792273391787
  claim: 1792273391787
  commit_linked:c8de22d3f: 1792273339151
  evidence_summary: 1792272829415
  owner_status: 1792273391787
  parent: 1792272829415
  priority: 1792272829415
  recovery_ref: 1792272829415
  status: 1792273391787
  title: 1792272829415
---
2026-10-17 assignment from s49436: "bind generic SDK APIs". Scope bridge.ts and emit.ts only. Resolve canonical witnesses from constraints, specialize generic owners, preserve metadata for facade. Validate whole SDK and adversarial Accelerate call. Shared internal checkout retained for lane. CI owner ci-manager.

Goal: generate sound canonical specializations of generic iOS SDK APIs, with no per-API lists.

Source: c8de22d3f7eec5214092ec5c9c8a0722132357ba, pushed and verified on origin tm/one-sdk-docs.
Paths: packages/one/codegen/sdk/bridge.ts and emit.ts only.
Lead: s50803. CI owner: ci-manager, notified with source and validation.

TESTED: full generator run against iOS 27.1 completed in 320 seconds with 0 errors left for every emitted module. Requested 290 modules; 289 graphs exist; Twitter has no usable graph in either baseline or this run.

Entries: 125149 -> 128915 (+3766). No baseline entry keys lost.
Skipped: 17577 -> 14181.
Generic-owner bucket: 4971 -> 1847.
Generic bucket: 4430 -> 2892.
Formerly generic-skipped symbols now bound: 3346 (2519 generic-owner and 827 generic).
Specialized entries: 3640.
Compiler-rejected skips: 1024 -> 1827, with exact compiler diagnostics retained. Zero errors left describes the final emitted tables after exclusions, not unrestricted API coverage.

TESTED: strict standalone TypeScript check of bridge.ts/emit.ts and imports passed.
TESTED: executed the exact generated Float vDSP.sum body with the native runtime on macOS: [2,3,4] -> 9. It rejected a handle containing [Double], reporting expected Array<Float> and got Array<Double>. USR s:10Accelerate4vDSPO3sumySfxAA0A6BufferRzSf7ElementRtzlFZ; parameter T: AccelerateBuffer, T.Element == Float, T specialized to [Float]. The concrete input cast and Float return annotation select the requested sum overload, and the negative witness check proves the entry does not silently accept a different buffer specialization.

New behavior: constraint equality closure, canonical standard witnesses, SDK-conformance-selected scalar or unique concrete witnesses, specialized generic owners including nested owners, substituted parameter/return/receiver ASTs. Entry.specialization and Entry.receiver are additive metadata; sent to facade owner s50763. Main-actor calls execute inside a main-actor closure so #isolation defaults work; this fixes the four baseline GameController errors.

Remaining generics: protocols without a canonical witness or enough graph conformance data (including private AppIntents value protocols and arbitrary publisher/estimator constraints), unresolved associated types, and unsupported packs, metatypes, callbacks, opaque inputs and mutating buffers. These remain explicit skips. No open-existential runtime implementation was added for arbitrary generic owners.

Evidence: coverage.json has all reason buckets, old-generic transitions and framework gains. genall/ contains all final Swift, entries, skipped reasons and empty errors files. genall.log, proof.swift, proof.log and typecheck.log preserve validation.

Cleanup: retained shared checkout /Users/n8/.worktrees/one-sdk-docs for live lead s50803 and co-tenants. All own source changes are committed and pushed; other sessions' uncommitted files untouched. No owned services or active watchers remain. Redundant focused generation removed after preserving the selected proof. Final generation retained (139 MB) for the lead's facade/docs integration. No release or production deployment requested. ci-manager owns required branch CI follow-up; s50803 owns final lane integration and Contrast plan update.
