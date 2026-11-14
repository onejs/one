---
id: t-muvx1ic7-9490
title: Prepare native launch CI, docs and starter coverage
status: done
assignees:
- s11717
labels:
- branch:fix/native-launch-checks
- branch:fix/native-launch-ci
- lane:native-ci-docs
- umbrella:plans/one-native-coverage.md
backend: git
commits:
- 105dc791f
created_at: 1791245029399
updated_at: 1791245745053
field_marks:
  active_form: 1791245029399
  body: 1791245745053
  claim: 1791245029399
  evidence_summary: 1791245029399
  parent: 1791245029399
  priority: 1791245029399
  recovery_ref: 1791245029399
  status: 1791245745053
  title: 1791245029399
---
RAN: landed/pushed 105dc791f to v2-beta and fix/native-launch-checks; Basic README 7778424a8 pushed v2-beta-starter. TESTED: 140 focused fixture/CLI/coverage/docs checks passed; original script fails two regression tests. RAN: actual iOS/Android prebuild passed for both consumers; Android workflow actionlint and source formatting passed. Gradle did not run: occupied heavy window, admission exit 75. Delivery open as t-muvxet9b-ep0 under native-lead p63991. Expected: Android Native Build, updated iOS Native Tests, Checks and Tests, canary content if shipped. Evidence: plans/one-native-ci-readiness.md and /tmp/one-native-launch-ci-*.log. Both worktrees removed; watchers stopped; primary fast-forwarded and clean. Handoff: /Users/n8/.team-machine/handoffs/one-native-ci-docs-s11717.md.
