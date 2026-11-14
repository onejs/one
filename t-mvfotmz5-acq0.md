---
id: t-mvfotmz5-acq0
title: Filter SDK reference call signatures to exported facade members
status: done
labels:
- lane:one-sdk-docs
- umbrella:one-ios-coverage
priority: 2
backend: git
created_at: 1792440548753
updated_at: 1792454440313
field_marks:
  active_form: 1792440548753
  body: 1792454440313
  claim: 1792440548753
  evidence_summary: 1792440548753
  owner_status: 1792440548753
  parent: 1792440548753
  priority: 1792440548753
  recovery_ref: 1792440548753
  status: 1792454440313
  title: 1792440548753
---
Follow-up after One2.9 closeout, not a new release gate. RAN both pre-refresh HEAD and current generated JSON advertise AVFoundation AVMetricEventStreamPublisher.allMetrics() and Accelerate vImage.Error.initVImageError(), but neither name is in its shipped facade. The existing emit-docs formatter walks native cache entries and does not apply Facade.emit publication filters. A disposable all-name closure probe correctly fails. Scope: derive displayed callable shapes from the actual exported facade surface or the same emission eligibility policy, retaining raw SDK declarations as reference and avoiding a second independent filter. Current release data refresh matches all290 cached entry/omission counts and corrects actual FoundationModels names, no claim of full facade-name closure. No native app/SDK generation needed for this documentation follow-up.

Peer p96232 mail403 adds TESTED signature evidence: Combine Cancellable.store(in:) documented as storeIn73510 while facade exposes AnyCancellable.storeIn88072; baseline HEAD documented storeIn9, so the missing public protocol callable pattern predates the refresh. Peer finds17 frameworks with suffixed doc names absent from declarations, incl AppIntents perform94370, CloudKit subscript79419, Foundation errorCode10671. Scope remains shared emission eligibility/public receiver handling in reference producer after release; no new native validation or release gate.

RAN approved PR975 merged into main as28cc4531bbc4fa1e392a92dc05529d318278d832. Stable Release39341475834 completed SUCCESS. Scoped runtime/protocol/wire changes and docs producer plus290-framework reference refresh are landed; no source work pending. Published package verification remains separately owned by p95796 under t-mvfqhp76-1rl70.
