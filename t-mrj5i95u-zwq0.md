---
id: t-mrj5i95u-zwq0
title: Move One NativeTabs behind its dedicated subpath export
status: done
assignees:
- ab-mrj3hklw-42266
labels:
- native-tabs
- one
- release
- start-chat
priority: 4
backend: git
created_at: 1783942840290
updated_at: 1784602785653
field_marks:
  active_form: 1783942840290
  body: 1783942840290
  claim: 1783942840290
  evidence_summary: 1783942840290
  parent: 1783942840290
  priority: 1783942840290
  recovery_ref: 1783942840290
  status: 1783942840290
  title: 1783942840290
---
Done in commit 1ebc9e0bf: native-tabs removed from packages/one/src/index.ts, exposed only via the one/native-tabs subpath export (packages/one/package.json exports './native-tabs'). Verified on main 2026-07-20.
