---
id: t-mthmbh4l-1co20
title: Land VxRN native Rolldown environment fix
status: done
assignees:
- m11196
labels:
- native
- one
- vxrn
priority: 3
backend: git
sessions:
- m11196
commits:
- f9abb4b4b2f1553cefe30fd8399b66caae5c3450
created_at: 1788203709813
updated_at: 1788203723828
field_marks:
  active_form: 1788203709813
  body: 1788203709813
  claim: 1788203709813
  evidence_summary: 1788203709813
  parent: 1788203709813
  priority: 1788203709813
  recovery_ref: 1788203709813
  status: 1788203709813
  title: 1788203709813
---
Preserve native ios/android and VITE_NATIVE authority over inherited VITE_ENVIRONMENT=ssr. Limit the change to createNativeDevEngine implementation and behavioral test. Validate, commit, and push to origin/main without touching unrelated generated drift.
