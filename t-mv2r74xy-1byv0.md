---
id: t-mv2r74xy-1byv0
title: Keep the native demo digest matched to the latest edited text
status: done
assignees:
- p74343
- s29025
labels:
- sweep-review
priority: 2
backend: git
created_at: 1791658477510
updated_at: 1791660711265
field_marks:
  active_form: 1791658477510
  assigned:s29025: 1791660711265
  body: 1791660711265
  claim: 1791658477510
  evidence_summary: 1791658477510
  owner_status: 1791658477510
  parent: 1791658477510
  priority: 1791658477510
  recovery_ref: 1791658477510
  status: 1791660711227
  title: 1791658477510
---
RAN: daily-sweep-2026-10-10-2 reviewed e1a8504ae on origin/v2-beta. examples/one-basic/app/native.tsx:21-23 starts Device.sha256(text).then(setHash) on each edit without invalidating the prior request. Exact landed component was transpiled and run with a hook/state fixture and controllable asynchronous Device boundary: render initial text, edit to new text, resolve new digest, then resolve initial digest. Output: text=new text displayedHash=hash-old. INFERRED: an older completion can overwrite the digest belonging to the visible input; native frequency was not measured. Acceptance: stale completions cannot update current hash; normal current completion still updates. Source-execution probe one-probes.ts accompanies reviews-2.md on pro-128. No release or landing gate.

Fixed in 667de4dec on v2-beta by s29025 (p74343 idle, unclaimed): effect cancels stale completions. RAN probe: resolving new then old digest, previous code shows hash-old, fixed shows hash-new.
