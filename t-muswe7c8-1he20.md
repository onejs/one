---
id: t-muswe7c8-1he20
title: Give One.iOS.NavigationStack's large title its leading margin when the stack is not full width
status: canceled
labels:
- lane:one-ui-docs
backend: git
created_at: 1791062543528
updated_at: 1793089835412
field_marks:
  active_form: 1791062543528
  body: 1793089835412
  claim: 1791062543528
  evidence_summary: 1791062543528
  owner_status: 1791062543528
  parent: 1791062543528
  priority: 1791062543528
  recovery_ref: 1791062543528
  status: 1793089835412
  title: 1791062543528
---
RAN on iOS 27 sim (iPhone 17 Pro): One.iOS.NavigationStack inside a 340pt wide rounded View (tests/native-features/docs-captures/IosNavigationScene.tsx with navigationBarTitleDisplayMode 'large') draws the large title 'Inbox' at x=0, its first letter clipped, while the toolbar buttons keep their 16pt inset. GUESSED: the hosting controller's layout margins come from a full-screen safe area that does not apply to the embedded frame. Not yet compared with a full-width stack.

Team Machine canceled this task: untouched for 7+ days with no live assignee. Reopen with `tm task update t-muswe7c8-1he20 --status open`.
