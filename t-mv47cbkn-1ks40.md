---
id: t-mv47cbkn-1ks40
title: Peach stub for One.iOS.MultiDatePicker
status: canceled
owner_status:
  state: needs
  text: MultiDatePicker qualified implementation3d8a5419e125 queued with PassKit; actual containing delivery and assigned review CI p90480; s43018 retains acceptance
  updated_at: 1792181143291
assignees:
- s43018
labels:
- peach
backend: git
created_at: 1791746059415
updated_at: 1793089895988
field_marks:
  active_form: 1791746059415
  assigned:coordinator: 1791791693528
  assigned:s43018: 1792106442645
  assigned:s44249: 1792094612619
  body: 1793089895988
  claim: 1792106442713
  evidence_summary: 1791746059415
  owner_status: 1792181143291
  parent: 1791746059415
  priority: 1791746059415
  recovery_ref: 1791746059415
  status: 1793089895988
  title: 1791746059415
  unassigned:coordinator: 1792094612619
  unassigned:r84992: 1791791693528
  unassigned:s44249: 1792106442645
---
One 3b440ce2d on v2-beta adds One.iOS.MultiDatePicker (selection: readonly Date[], onSelectionChange: (value: readonly Date[]) => void, revision, label, minimumDate/maximumDate, disabled). Stub should render a month calendar grid with the selected days highlighted, day-precision, device calendar. Fixture: tests/native-features/fixtures/one-native-picker-passkit.tsx. Device proof of the real control is pending with m30241.

Team Machine moved this task to coordinator: every assignee (r84992) had ended.

RAN manager current public generated Controls.native emits OneNativeMultiDatePicker, no matching Peach native host/registration found. Assigned existing approved compatibility implementation to reusable StudioSol s44249, Contrast delivery companiont-mv9yu0v8-13m20; no One source/API writes. Current source/native contract authoritative over historical beta task. Existing calendar owner reused, actual mounted fail-before/native oracle required; nativeOpus m35422 one assigned post-land review non-gating, CIp88682. No extra slot, lane target8 unchanged.

RAN s44249 bounded close-out: actual installed One wrapper mounted missing OneNativeMultiDatePicker host, six invalid-input rejections unchanged. No One source/API writes or native seam implementation. Canonical full-library build failed FirebaseCoreInternal CocoaPods clone curl56/earlyEOF; owner s42479 handles sole producer. Preserved evidence Studio Contrast scripts/tmp/multidate-s44249; manager retains approved reusable reservation after real prerequisite change. Full handoff Contrast scripts/tmp/sidebar-host-s44249/final-handoff.md.

Manager reconciliation: s43018 retains this unfinished acceptance claim per coordinator. Historical author/native-build/dead-session references are superseded by this report. Source implementation is preserved; no new producer, source restart or unchanged retry. CI p90480 owns actual delivery, current conformance lead m37511 owns source/proof routing.

Team Machine canceled this task: untouched for 7+ days with no live assignee. Reopen with `tm task update t-mv47cbkn-1ks40 --status open`.
