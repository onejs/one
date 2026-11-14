---
id: t-muxku8dz-1fd70
title: Enable the native widget fixture and prove the actual One JS bridge
status: canceled
labels:
- native-apis
priority: 3
backend: git
sessions:
- p66025
created_at: 1791345466871
updated_at: 1793089834546
field_marks:
  active_form: 1791345466871
  body: 1793089834546
  claim: 1791354688631
  evidence_summary: 1791345466871
  owner_status: 1791345466871
  parent: 1791345466871
  priority: 1791345466871
  recovery_ref: 1791345466871
  status: 1793089834546
  title: 1791345466871
---
You own a bounded existing-feature fix in public ~/one only, parent r62729. REVIEW: none; the completed capability later gets its single assigned Opus review. Use Muse Spark contributor Max on the fixed cam subscription only. Do not spawn.

Manager READ: tests/native-features/vite.config.ts has no native.app.ios.widgets configuration; COVERAGE.md marks Widgets and LiveActivities missing and says the fixture needs a widget extension target. packages/one/src/platform/widgets/index.native.ts throws when OneWidgetsBridge is absent. Existing fixtures/realapps-api-widgets.ios.tsx already calls actual One.Widgets.write/writeView and scalar/JSX LiveActivities start/update/end. A raw Swift writer is insufficient to prove this real JS bridge.

Fix the standard fixture for these existing One APIs on a branch tm/native-widget-fixture off current v2-beta in this managed worktree. Inspect the public One instructions and existing native widget/prebuild integration first; reuse the existing fixture and standard generator rather than inventing a separate native app, API, writer or harness. Reproduce the unsupported bridge on the installed fixture or equivalent original configured target before repair. Add the missing extension configuration and any strictly necessary fixture integration. Then compile the changed app/extension targets and run the actual mounted One JS calls: scalar and JSX writes, correct configured App Group/key and authored bytes, actual LiveActivities scalar/JSX start/update/end with stable IDs and missing/ended-ID rejection. Assert loaded fixture/build/JS identity explicitly. Existing oracle captures can be reused; no Home/island/Lock GUI recapture and no pixel claim from write completion. Keep Android's unsupported contract.

Scope is public ~/one source and public One evidence. Never read private Contrast source, plan, tasks, engine/factory evidence or Swift runtime internals. No new One API/product/starter, no One main push, no Apple credentials/portal mutation, no physical-device claim, no broad native-suite rerun or full repository build. Native compilation uses normal admitted shared builders, saved dependencies/caches and changed targets only; standard claimed iOS27 devices, no co-tenant input or state cleanup. If required build tools or a supported installed artifact are absent, record the exact blocker instead of substituting raw Swift proof.

Focused validation follows One's own package scripts: existing widget generation suite, affected fixture types and native changed-target compilation, then actual JS runtime proof and falsifiers above. Validate source before pushing the existing-feature fixture repair to v2-beta; One main stays untouched. State actual validation in commit bodies. Normal beta/canary rules apply; no stable release. Record branch/base/full range, exact build/artifact identities, calls/results and limits. Parent r62729 owns One follow-up; Contrast downstream delivery remains s11795, do not wait for its CI or send routine mail.

Store evidence and a handoff under ~/one/scripts/tmp/native-widget-fixture/ outside the worktree. Preserve source/evidence, stop your own servers/Metro/build jobs, release your device claim, and remove your managed worktree normally, recording a held result rather than forcing deletion. Finish once with tm finish --handoff <path> under4KB. No ACK/progress/completion mail. Only a genuine blocker needing parent action may be sent once.

Team Machine canceled this task: untouched for 7+ days with no live assignee. Reopen with `tm task update t-muxku8dz-1fd70 --status open`.
