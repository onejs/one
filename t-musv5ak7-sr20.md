---
id: t-musv5ak7-sr20
title: Stop One.iOS.DisclosureGroup clipping a Toggle's overhang on iOS 27
status: canceled
labels:
- lane:one-ui-docs
backend: git
created_at: 1791060448183
updated_at: 1793089835651
field_marks:
  active_form: 1791060448183
  body: 1793089835651
  claim: 1791060448183
  evidence_summary: 1791060448183
  owner_status: 1791060448183
  parent: 1791060448183
  priority: 1791060448183
  recovery_ref: 1791060448183
  status: 1793089835651
  title: 1791060448183
---
RAN on iOS 27 sim (iPhone 17 Pro): a One.iOS.Toggle inside an expanded One.iOS.DisclosureGroup (VStack width 264) has the right ~2pt of its track cut off; the same Toggle as a VStack sibling draws ~2pt past its frame uncut. INFERRED: the disclosure content clips to bounds while the iOS 27 toggle overhangs its layout frame. Repro: tests/native-features/docs-captures/IosGroupsScene.tsx with a Toggle inside the DisclosureGroup. Not yet compared with plain SwiftUI.

Team Machine canceled this task: untouched for 7+ days with no live assignee. Reopen with `tm task update t-musv5ak7-sr20 --status open`.
