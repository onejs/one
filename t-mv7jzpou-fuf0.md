---
id: t-mv7jzpou-fuf0
title: Make native bundle bindings deterministic
status: done
owner_status:
  state: needs
  text: implementation complete, upstream fix11206/One regression865 validated and pushed; consumer delivery t-mv7ljiw0-23ci0 remains open under s37966
  updated_at: 1791951470700
labels:
- branch:tm/one-bundle-determinism
- lane:one-bundle-determinism
- umbrella:plans/peach/runtime-release-speed.md
backend: git
commits:
- 21175295accf538264614f39480ceeed2cd76933
created_at: 1791948704718
updated_at: 1791951470869
field_marks:
  active_form: 1791948704718
  body: 1791951470869
  claim: 1791948704718
  commit_linked:21175295accf538264614f39480ceeed2cd76933: 1791951307669
  evidence_summary: 1791948704718
  owner_status: 1791951470869
  parent: 1791948704718
  priority: 1791948704718
  recovery_ref: 1791948704718
  status: 1791951470701
  title: 1791948704718
---
Assigned by s38154. Trace generated RN suffixes; fix producer; three byte-identical native bundles plus positive difference control. PR in One; test local release into Contrast. One CI s37966; Contrast CI r90350. No reviewer.

RAN minimal carrier probe executes [11,22,33,44] under both schedules. Raw output differs only import_shared suffix allocation; native Rust place_order_wrap_modules consumes unsorted order_cjs_carrier_keys (FxHashMap keyed by load-assigned ModuleIdx). Main upstream has same code. Evidence ~/.team-machine/results/one-bundle-determinism/carriers.mjs and carriers-{1,2,3}.js.

RAN actual buildNativeBundle regression fails on import_shared suffix permutation with assertions proving controlled parse order and [11,22,33,44] execution. Native Rust fix sorts carrier registration by (importer execution order, import-record index), matching ordinary wrapper ordering; candidate binding build pending. Conventional One delivery needs a released upstream binary; no runtime workaround proposed.

Correction: the first saved test used minify true and passed because current full minification masks suffix drift; fixture now uses minify false (the default dce-only output behavior), which previously produced the actual suffix-only failure. Follow-up local check refused admission with exit75; candidate native binding build and positive control still pending.

Delivery owners: One s37966, Contrast r90350. Branch tm/one-bundle-determinism commits d49950941300bdfea0d25b85b8ca867d36057fef and 21175295a; draft PR not opened yet. No runtime fix consumed yet, no main push, native binary build is diagnostic-only. Studio source /Volumes/Studio-Ext/builders/rolldown-one-determinism-m32914; target external; retained by live owner m32914 for validation.

RAN native build watcher w-1a9759 refused admission:2.3 available cores below requested4; no compilation started. Corrected bounded job requests2 cores and cargo -j2, retains external source/target and exact tagged source fix. Remote shell now stops immediately on refusal.

Native v1.2.8 fix compiled and actual buildNativeBundle regression passes2tests, three controlled loads byte-identical and source-change control changes bytes/value. Producer now TESTED: sorting only carrier registration fixes the prior suffix-only failure. Same patch cleanly applied to v1.2.13 as83f4812d; fork push/upstream draft in progress. Upstream publication owner being routed by s38154 to coordinator. One PR still pending final validation; CI s37966/r90350.

RAN matching v1.2.13 build refused before start at CPU idle5% below20% floor (w-daae26). Replaced immediate refusal path with existing detached wait-heavy-admission watcher, cargo -j1. Upstream push hit unbounded osxkeychain helper; terminated exact owned helper/push after lsof attribution and switched fork remote to existing SSH auth. Friction filed tm-defect. No runtime bytes or source were changed by either failure.

RAN upstream draft opened https://github.com/rolldown/rolldown/pull/11206, pushed native cause fix83f4812d to natew/rolldown fix/deterministic-cjs-carriers. One draft opened on tm/one-bundle-determinism (dependency update intentionally pending upstream binary release). Candidate v1.2.13 binding compilation and bun release --into ~/contrast plus3CLI calls/input-control run in the next exact watcher; no stable publication or main push authorized.

RAN w-1a6888 exit0: compiled matching1.2.13 native fix, local release17packages into Contrast, three CLI calls12.37/12.44/9.68s all9359339B SHA400a5db3178ec0ec777ffec04c761511ef59561df0c12445cb0ad2a0922581d1; route-control9359393B SHAa0353eb7d838928838d2ab33b0125d350154547cca0d268a7ca35209353b8240, marker present, source restored. Full native app/cache acceptance remains false. Released1.2.13 upstream test fails equality only and positivecontrol passes. Optional patched upstream runner failed startup because native13 override reached Vite using bindingAPI8; corrected setup scopes override after runner config. One actualpipeline8 test and fullContrast13 CLI already pass. Parent directed no release wait or production fork; close after final source test and cleanup.

TESTED final upstream1.2.13 behavioral source:2tests pass with scoped patched binding; released1.2.13 fails only equality, positive control passes. PR descriptions updated. Evidence copied to Studio /Volumes/Studio-Ext/tart-ci/proof/native-cache-s38154/one-bundle-determinism-m32914/ and retained on air-32 ~/.team-machine/results/one-bundle-determinism/. CLEANUP: remote native source/target and generated Contrast probe app removed. One managed remove reports kept only own process PIDs18168/18207/18209/18210/18713 and release-on-session-exit; tree clean, all commits pushed, parent verifies removal after finish. Clean diagnostic upstream primary clone /tmp/rolldown-one-determinism-m32914 retained as source evidence because tm refuses primary-checkout removal, live lane owner s38154; v1.2.13 contribution branch and v1.2.8 proof branch both pushed, patches archived. No active servers, native claims, child agents or running waits. Consumer17package local install retained as authorized; no persistent native override.
