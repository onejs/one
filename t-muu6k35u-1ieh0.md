---
id: t-muu6k35u-1ieh0
title: 'One native blur: vendor react-native-blur variable blur + Android backdrop'
status: canceled
assignees:
- a22608
labels:
- lane:one-native-blur
- umbrella:none
backend: git
created_at: 1791140080386
updated_at: 1793089834927
field_marks:
  active_form: 1791140080386
  body: 1793089834927
  claim: 1791140080386
  evidence_summary: 1791140080386
  owner_status: 1791140080386
  parent: 1791140080386
  priority: 1791140080386
  recovery_ref: 1791140080386
  status: 1793089834927
  title: 1791140080386
---
iOS EdgeFade blur -> OneNativeVariableBlurView (CAFilter variableBlur, curve mask). iOS UI.Blur -> OneNativeBlurEffectView (self-healing animator). Android: OneNativeBackdropCapture (QmBlurView capture, behind-only walk) feeding EdgeFade level stack + UI.Blur RenderEffect. Status: code written, iOS before-build running.

Team Machine canceled this task: untouched for 7+ days with no live assignee. Reopen with `tm task update t-muu6k35u-1ieh0 --status open`.
