---
id: t-mvfkp26n-24sr0
title: Implement the approved native drag binding API
status: done
owner_status:
  state: landed
  text: approved fixed-host native drag implemented, merged and bounded device proof accepted
  updated_at: 1792451346601
assignees:
- p95796
labels:
- native-drag
- one-ios-sdk
priority: 3
parent_id: t-mvfhwbnq-7a90
backend: git
created_at: 1792433616719
updated_at: 1792451346601
field_marks:
  active_form: 1792433616719
  assigned:p95796: 1792451273314
  body: 1792451346601
  claim: 1792433616719
  evidence_summary: 1792433616719
  owner_status: 1792451346601
  parent: 1792433616719
  priority: 1792433616719
  recovery_ref: 1792433616719
  status: 1792451346601
  title: 1792433616719
  unassigned:p96232: 1792451273314
---
Owner direction 2026-10-19 to p95796, inbox answer i-1792433379396-55831-0: "Approve this API". Approved question: bind a drag to NativeState through {state, axis, range}, optional absolute snap targets and native animation. First version moves SwiftUI content inside a fixed React Native host, without reflowing RN siblings or extending touch handling beyond the host. Existing proposal a93535fe15c: continuous CGFloat/Double fields including record members; Int stays literal; initial/later read validation at binding seam, no fabricated state.set throws guarantee. Preserve named/scalar/record inputs and old unbound gestures. Record exact owner quote/date/scope in Contrast native-drag plan before implementation. Opus p96232 owns implementation; p95796 peer review/current PR961 CI; s51006 changed-target/native proof. Approved plan proof is blocked-JS movement/snap against native reference with ordinary teardown and fixed-bound touch behavior; no 100% target or new release gate. Numeric-record repair m46593 is active on isolated a0cb candidate in the same generators, lead integrates that separately; preserve its changes. No SDK fingerprint changes/full290 producer unless actual boundary requires it; report dependency rather than silently expanding. No merge/stable publish approval.

TESTED peer d0cd actual encoder accepted serialized reversed range/null targets and snap200 outside bind0...100. Original author supplied canonical emitter/test patch and pushed native guard15a7474d80. Lead applied emitter patch to combined source, also reads range getter once and rejects a provided range serializing to undefined. Exact native before/after probe w39583e PASS with real registry/binding: target100 preserved, target200 accepted by d0cd and rejected by15a; only animation decoder doubled, no UI claim. Combined final generation/build running; native device proof pending.

Owner approval and first-cut scope verified in original Contrast native-drag plan: fixed RN host, no Yoga sibling reflow or out-of-host touches. Pending device proof remains blocked-JS movement+snap in kinetic fixture; no exhaustive coverage target. Lead peer review resolved serialized payload and snap-clamp defects before any app build.

RAN native-drag implementationd0cd+15a and integrated encoder repair0b116124c0 pushed. Final encoded arrays validate exact serialized JSON, snap targets stay inside range, canonical numeric values retained. Native before/after real registry/binding control rejects prior out-of-range target200, preserves100; encoder negative controls pass. Full platform Swift typecheck, package build and6 existing suites198 checks passed. New movement/blocked-JS/device proof remains unrun and routes through existing s51006.

TESTED58ab same-origin fix remains incorrect at real registry/binding boundary: state0, changed+100 from(100,20), cancelled with no ended, a new binding changed+10 from the same local origin writes10 instead of110. Real58ab Swift compiled w-1d4b35; evidence native-drag-review/same-origin. Original author p96232 requested per-view/session lifetime and cancellation reset; key-by-point is not accepted. Native validator restores missing frozen-lock dependencies independently before next changed-target app build; no extra producer.

REVIEW82c4333e52 APPROVED by leadp95796 for source delivery. Static starts table removed; OneNativeDragHost owns GestureState start and per-view session. SwiftUI documented updating(_:body:) explicitly resets on end/cancel (developer.apple.com/documentation/swiftui/gesture/updating(_:body:)); no coordinate identity remains and all3 attachment kinds preserved. TESTED real82c binding+registry supplied fresh start writes110, snap200 and clamp0, w-9e56f0; this probe does NOT exercise actual SwiftUI cancellation or device movement. Original author full platform generate/Swift check passed. Native changed-target queue s51006 to take exact82c/unchangedABI0e503 after fresh-context locked pod artifact resolution; no extra full producer.

2026-10-19: p96232 transferred to lead p95796 at close-out; scope frozen at release candidate per owner direction, no unfinished p96232 source pending.

Lead closeout reconciles transferred record: implementation was completed, not unstarted. RAN source82c is ancestor of origin/main. Final s51006 handoff404 records unchanged swift-gestures PASS; during JavaScript block divider moves while labelsnone/0 then250/1, snaps-250/0/250 PASS. Fixed RN host/no Yoga sibling reflow/no outside-host touch promise retained. Actual SwiftUI cancellation and device performance remain explicitly unclaimed rather than new release gates. Source/runtime/native bounded scope complete; stable delivery remains parent release task.
