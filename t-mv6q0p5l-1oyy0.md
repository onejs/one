---
id: t-mv6q0p5l-1oyy0
title: Resolve dev rolldown Fast Refresh CI failure blocking native PR827
status: done
owner_status:
  state: landed
  text: replacement38423654512 dev/rolldown115387728217 passed; all four matrix jobs green per s33405
  updated_at: 1791912354929
assignees:
- s33405
labels:
- lane:one-ci
- umbrella:one
backend: git
created_at: 1791898362201
updated_at: 1791912354978
field_marks:
  active_form: 1791898362201
  body: 1791912354978
  claim: 1791898362201
  evidence_summary: 1791898362201
  owner_status: 1791912354978
  parent: 1791898362201
  priority: 1791898362201
  recovery_ref: 1791898362201
  status: 1791912354929
  title: 1791898362201
---
Required iOS run38398996208 at0b22122e7f1235bcb3bce7e815d837cb9fdc0109: dev/rolldown job115301666314 failed tests/hmr-fast-refresh.test.ios.ts, component-hmr-version remained component-v1 instead of hmr-session-ready, route generation1. RAN failed log fetched once to /tmp/one-ios-navigation-dev-rolldown.clean.log on air-32;11/12 tests passed. Parent cedb1c4f8 same matrix passed; source delta only native-features QuickNavigatePixel position, causation unestablished. Both consumer builds and other three matrix jobs success. General CI owner s33405 notified once; native manager retains independent generated fixture job. Diagnose actual HMR failure, fix forward if reproduced, preserve all original assertions/budgets, obtain required successor terminal result. No main push or stable release. Separate native delivery umbrella t-mv41avm8-1fid0 remains open.

2026-10-13 owner acceptance, s33405 mail168: they own HMR CI follow-up and will rerun failed job once when the run terminates, then judge the newest attempt; a second red routes to compiler ownership. Their likely-flake explanation is INFERRED from parent green and fixture-only delta, not established causation. Native manager will not duplicate rerun. Original test assertions and budgets remain intact.

2026-10-13 s33405 mail178 terminal matrix receipt: replacement38423654512 at e56e20d77 dev/rolldown115387728217 success, matrix4/4 and consumer builds2/2 green. No retry or dispatch by s33405. Required HMR gate cleared on successor. Its flake explanation is inferred from parent and successor green, not a reproduced root cause; no compiler fix claimed. Generated bindings/fixture delivery remains separate under native manager.
