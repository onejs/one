---
id: t-mvd0aicp-1x770
title: Typecheck every generated iOS SDK facade together
status: done
owner_status:
  state: landed
  text: cb5a5aa88 pushed tm/one-sdk-docs; 289 facades/50,858,991 bytes, strict tsc 354 diagnostics (177 unique) ->0, 1.66s->0.76s; 289 Swift tables zero errors; Twitter is Swift-incompatible. ci-manager owns CI.
  updated_at: 1792279203688
assignees:
- s50853
labels:
- lane:one-ios-facades
- umbrella:one-ios-sdk
backend: git
sessions:
- s50853
commits:
- cb5a5aa88fea4d60964821b44b9cf062fb7c8e0e
created_at: 1792278413161
updated_at: 1792279228951
field_marks:
  active_form: 1792278413161
  body: 1792279228951
  claim: 1792278413161
  commit_linked:cb5a5aa88fea4d60964821b44b9cf062fb7c8e0e: 1792279203576
  evidence_summary: 1792278413161
  owner_status: 1792279203688
  parent: 1792278413161
  priority: 1792278413161
  recovery_ref: 1792278413161
  status: 1792279203688
  title: 1792278413161
---
TESTED cb5a5aa88fea4d60964821b44b9cf062fb7c8e0e, pushed origin/tm/one-sdk-docs. Changed only emit-ts.ts: owner-wide and lowered/inherited member collisions, value alias generic arity, duplicate generic parameter names, constrained alias parsing. Docs already share facadeCallFormatter. Inventory 290 SDK modules, 289 Swift-importable modules generated in one Swift pass with saved entries, all Swift tables zero remaining errors; Twitter incompatible with Swift per Apple extractor. Baseline emitted 287 facades plus AppIntents/UIKit crashes; tsc 354 raw diagnostics (177 unique after macOS /tmp aliases), 1.663s. Final 289 facades, 50,858,991 bytes, zero errors in strict tsc, 0.760s. Final config canonicalizes scratch paths; facades are .ts and checked despite skipLibCheck on dependencies. Targeted reruns use cached entries only. Source strict tsc and old-fails/new-passes graph regression, value/suffix collision probes and mocked-native dispatch probes pass. Would disprove: generated facade set from this commit reports diagnostics with the saved strict config. CI owner ci-manager. No simulator. Shared tree retained for s50803 and other workers. Evidence retained /tmp/one-sdk-facades-s50853, owner s50803. pro-64:/tmp/one-sdk-facades-s50853/source retained at 0ce5f9b180 because automatic approval rejected recursive remote cleanup; generation script disabled; owner s50803. Unknown remote tm launch receipts and transport defect recorded in t-mvd0fc4r-1le0. Handoff outside tree: /tmp/one-sdk-facades-s50853/handoff.md.
