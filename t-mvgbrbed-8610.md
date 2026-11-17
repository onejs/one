---
id: t-mvgbrbed-8610
title: Allow finished worker cleanup of its own worktree
status: canceled
owner_status:
  state: landed
  text: replaced by Team Machine defect t-mvgbryb6-cuj0; this duplicate was filed in One.
  updated_at: 1792479109981
labels:
- tm-defect
backend: git
created_at: 1792479071605
updated_at: 1792479109981
field_marks:
  active_form: 1792479071605
  body: 1792479071605
  claim: 1792479071605
  evidence_summary: 1792479071605
  owner_status: 1792479109981
  parent: 1792479071605
  priority: 1792479071605
  recovery_ref: 1792479071605
  status: 1792479109981
  title: 1792479071605
---
tm worktree remove from /Users/n8/one refuses clean published One worktree /Volumes/Samsung-1TB-990/worktrees/one-ios-hmr-route because owning session wrapper node PID45150 holds original cwd. All task services stopped. User asked worker to remove its worktree before finish. No source changes remain; PR982 f3adce2ef. Need own-session handoff cleanup to release wrapper cwd or allow safe deferred removal.
