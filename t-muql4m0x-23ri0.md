---
id: t-muql4m0x-23ri0
title: Fix the test app's Android Release bundle so it resolves native-source .kt imports
status: canceled
priority: 2
backend: git
created_at: 1790922687873
updated_at: 1793089836989
field_marks:
  active_form: 1790922687873
  body: 1793089836989
  claim: 1790922687873
  evidence_summary: 1790922687873
  owner_status: 1790922687873
  parent: 1790922687873
  priority: 1790922687873
  recovery_ref: 1790922687873
  status: 1793089836989
  title: 1790922687873
---
found by s6050 building tests/native-features Android Release on studio-64 (log there: ~/contrast/scripts/tmp/one-storage-proof/android-build.log): Metro cannot resolve ../native-source/Audio.kt from fixtures/one-native-source.android.ts in the gradle release bundle (one/react-native-config), although the file exists.

Team Machine canceled this task: untouched for 7+ days with no live assignee. Reopen with `tm task update t-muql4m0x-23ri0 --status open`.
