---
id: t-mvfqqpqs-1n9v0
title: Align reference calls with actual generated facade exports
status: done
labels:
- lane:one-sdk-docs
- one-ios-coverage
parent_id: t-mvfqpuri-1hf80
backend: git
sessions:
- p97488
commits:
- 921187bdd476b3e776d02ba87b79dd9d4fc5ea19
created_at: 1792443771604
updated_at: 1792444594016
field_marks:
  active_form: 1792443771604
  body: 1792444520155
  claim: 1792444594016
  claim_current:9f56341ac6f8237b92d564ef3e79533e: 1792444594016
  claim_state:9f56341ac6f8237b92d564ef3e79533e:1792444594016:~:~:~:o:d91a5ea231da12dac510af40687de38b: 1792444594016
  claim_state:d91a5ea231da12dac510af40687de38b:1792443794286:=p97488:=mc-h39p4gbj818h:1792443794286:f: 1792443794286
  commit_linked:921187bdd476b3e776d02ba87b79dd9d4fc5ea19: 1792444479417
  evidence_summary: 1792443771604
  owner_status: 1792443771604
  parent: 1792443771604
  priority: 1792443771604
  recovery_ref: 1792443771604
  status: 1792444520155
  title: 1792443771604
---
Repair preexisting docs producer gap t-mvfotmz5-acq0. Own only codegen/sdk/emit-docs.ts and existing relevant documentation tests; helpers do not modify emit-ts/bridge/runtime or290 artifacts. Use actual formatter/export eligibility shared API or request seam from Opus owner, no source-name regex that mimics emitter. Do not advertise callable TypeScript names absent from facade; retain raw SDK declarations separately. Examples Combine protocol Cancellable.storeIn73510 vs actual AnyCancellable.storeIn88072, AVMetricEventStreamPublisher.allMetrics. Proof existing real retained metadata/façade comparison and one meaningful negative control. Shared tree; explicit stage own paths, commit/push branch, no native/fullSDK generation. Peer review lead after implementation; CI managerp96184 main, lead branch.

Done: commit 921187bdd4 on tm/one-sdk-docs (pushed). emit-docs.ts filters typescript to emitFacade-published entries; new sdk-docs-exports.test.ts 3/3 green (failed before), tsc clean, retained docs-vs-facade probe confirms Combine Cancellable.storeIn73510 + AVMetric allMetrics gaps and class-owned controls. Only owned paths touched. REVIEW sent to p95796; branch CI lead, main CI p96184. Note: received 3 misdirected research-scope mails apparently for p97487; continued per docs prompt, flagged to lead.
