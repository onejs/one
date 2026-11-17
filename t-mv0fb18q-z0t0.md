---
id: t-mv0fb18q-z0t0
title: Keep One cache cleanup scoped to owned Vite outputs
status: canceled
labels:
- lane:one-runtime
backend: git
created_at: 1791517571594
updated_at: 1793089834158
field_marks:
  active_form: 1791517571594
  body: 1793089834158
  claim: 1791517571594
  evidence_summary: 1791517571594
  owner_status: 1791517571594
  parent: 1791517571594
  priority: 1791517571594
  recovery_ref: 1791517571594
  status: 1793089834158
  title: 1791517571594
---
RAN: Chat one dev on beta.362.1 failed ENOTEMPTY removing node_modules/.vite/task-cache while concurrent bun check populated that directory. packages/vxrn/src/exports/clean.ts recursively deletes all .vite, including Takeout check cache. Narrow cleanup to owned artifacts or separate cache ownership. Existing clean.test.ts covers cleanup. Repro log /Users/n8/contrast/scripts/tmp/chat-runtime-repair/web-after.log (earlier attempt overwritten; error recorded in chat runtime repair task).

Team Machine canceled this task: untouched for 7+ days with no live assignee. Reopen with `tm task update t-mv0fb18q-z0t0 --status open`.
