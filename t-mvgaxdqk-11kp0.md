---
id: t-mvgaxdqk-11kp0
title: Fix new-route iOS HMR navigation failure
status: done
owner_status:
  state: landed
  text: 'PR982 f3adce2ef; p98336 review/prune after worker exits, p96184 CI. HTTP/native65s/typecheck/lint pass. Clean published worktree retained: own wrapper cwd blocks tm removal. Services stopped; sim released. Evidence: task-evidence/one-ios-hmr-route-s56922.'
  updated_at: 1792479102156
labels:
- native
- one
- umbrella:t-mv7sbq1k-14fl0
backend: git
sessions:
- s56922
commits:
- f3adce2ef
created_at: 1792477674956
updated_at: 1792479102156
field_marks:
  active_form: 1792477674956
  body: 1792478906993
  claim: 1792477674956
  commit_linked:f3adce2ef: 1792478936847
  evidence_summary: 1792477674956
  owner_status: 1792479102156
  parent: 1792477674956
  priority: 1792477674956
  recovery_ref: 1792477674956
  status: 1792479022675
  title: 1792477674956
---
Parent Contrast task t-mv7sbq1k-14fl0. RAN retained job logs: 118384511309 + 118470712601 fail initial navigateTo before new route creation; 118058205018 + 118008471524 fail hermesc cache restore. Passing 118445031509 has similar initial readiness (49.97s vs failed PR47.37s). INFERRED: CI second-launch errors are native URLSession timeout during stale full-bundle rebuild; original Appium XML error is truncated. TESTED iOS27 NativeFeatureTests app: 65s delayed bundle, plain canceled60.286s, headers-only multipart canceled60.360s; multipart build-status every10s executes Hermes99 at65.002s (intentional delivered-script error marker distinguishes network error). Evidence /tmp/one-ios-hmr-route-evidence. Actual plugin gated HTTP check failed before patch, passes after; final stream-reader regression rerun pending resource admission. vxrn typecheck + focused lint pass. Full HMR iOS suite not validated locally: first attempt used incompatible saved compiler98 vs app99 and was stopped; probe corrected to99. Native simulator released, owned services stopping. Lead p98336 reviews PR; p96184 owns full native dispatch + CI.
