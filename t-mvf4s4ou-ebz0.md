---
id: t-mvf4s4ou-ebz0
title: Resolve exact Sheet height-detent position mismatch
status: done
owner_status:
  state: landed
  text: native0c/90ad height300 exact535pt and medium1246px pass
  updated_at: 1792409445266
assignees:
- p95796
labels:
- one-ios-sdk
parent_id: t-mvd1h69m-wa10
backend: git
sessions:
- p95796
created_at: 1792406886078
updated_at: 1792454970264
field_marks:
  active_form: 1792406886078
  body: 1792409445266
  claim: 1792454970264
  claim_current:d138c5ea0fc2e8d6312ee10c275abd58: 1792454970264
  claim_state:12ff38e5087ce5872fd0bd53cf7ec65f:1792407167823:=p95796:=mc-h39p4gbj818h:1792407167823:f: 1792407167823
  claim_state:d138c5ea0fc2e8d6312ee10c275abd58:1792454970264:~:~:~:o:12ff38e5087ce5872fd0bd53cf7ec65f: 1792454970264
  evidence_summary: 1792406886078
  owner_status: 1792409445266
  parent: 1792406886078
  priority: 1792406886078
  recovery_ref: 1792406886078
  status: 1792409445266
  title: 1792406886078
---
RAN first next failure w-ca0568 nativeea6d88f76d/driver3580b06793/SDK90ad, no rebuild. Exact input Retained, close/onDismiss1, reopen retention, nested open/close, fraction retention PASS. Height300 predicate expects heading px x59/y1605/w1062/h56; saved AX heading pt x19.51145038/y599.06191688/w353.97709924/h18.54622074 => rounded px59/1797/1062/56, so only y differs from expected535pt. App393x852; counter1 and exact Retained persist; Detents:height300 visible. Evidence /Users/n8/.cache/one-sdk-docs/ea6-driver3580-sheet.log, ea6-driver3580-sheet/height-failure-summary.json, fail-height-detent-preserves-rn-state-at-its-exact-native-position.webp (1179x2556). Cause not isolated; no geometry assertion weakening, retry or further interaction. Author/lead needs inspect expected detent geometry versus actual current native behavior and return exact correction/source receipt. Later dismissal/fitted230/430 ownership checks NOT proven. Preserved nativeea6 baseline and driver mirror.

RAN lead inspected actual capture and current OneNativeSlot sizeThatFits: every Sheet passes measuredHeight167 even under automatic sizing; max-height outer frame centers this intrinsic slot in fixed300. INFERRED this accounts for 64pt heading shift: half(300-167) times visible sheet scale≈64. Cause fix owns emitSheet.ts + generated SheetContent only: supply measured height only when presentationSizing=fitted; normal detents consume proposal. Preserve exact535pt oracle, no driver geometry change. Native minimal current-host update belongs s51006 after source receipt.

Pushed0c6130a8d6 to tm/one-sdk-docs, source-reviewed batch40-sizing. Reviewer-pinned emitter/Swift SHA256 exactly match committed bytes. Isolated9-output Sheet generation matches, existing10checksPASS, SwiftparsePASS. Capture shows vertical blank margins from intrinsic167 slot centered within300. Source fixes fitted-only measured height; native exact535pt/medium/fitted230/430 assertions unchanged. s51006 assigned minimal current-host update including already-needed generatedPager/Sheet paths, preserves warmDD and90adpair, no SDKregen or clean. Later physical dismissal/retention acceptance remains open.

RAN exact0c native/JS + SDK90ad w-d7369f: unchanged height300 exact535pt predicate PASS, medium y1246px PASS, retained text/state PASS. Blocked drag remains interactive and programmatic close PASS; accepted interactive dismiss updates React/onDismiss PASS. Prior height sizing blocker closed actual native proof. Suite later stops on unrelated recycled-freshness label-adjacency driver predicate; full suite not accepted.

TESTED s51006 w-d7369f exact0c native/JS and SDK90ad: fixedheight300 heading535ptPASS, medium1246pxPASS; retention/nested/blockeddrag/programmaticclose/acceptedinteractiveonDismissPASS. Fitted-only measuredHeight0c cause fix proved actualapp, strictgeometry assertions untouched. Next driver labeladjacency bug separately t-mvf688dx-wiv0; fitted230/430/revision queue stillopen.
