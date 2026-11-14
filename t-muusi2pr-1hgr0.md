---
id: t-muusi2pr-1hgr0
title: Correct Android ScreenCapture recording and screenshot design
status: done
assignees:
- p61888
labels:
- branch:tm/beta-android-system
- lane:beta-android-system
- umbrella:plans/one-native-launch.md
parent_id: t-muu8ms26-161y0
backend: git
created_at: 1791176938047
updated_at: 1791188437640
field_marks:
  active_form: 1791176938047
  body: 1791188437640
  claim: 1791176938047
  evidence_summary: 1791176938047
  parent: 1791176938047
  priority: 1791176938047
  recovery_ref: 1791176938047
  status: 1791188437590
  title: 1791176938047
---
ScreenCapture corrected design APPROVED p60786 (frozen 2026-10-05T07:41Z, verdict screen-correction-approval.md) and IMPLEMENTED e37b9a243: HybridOneScreenCapture.kt (API34 screenshot + API35 WM recording + PixelCopy 26+, E_SCREEN_CAPTURE_RENDER sub-26, idempotent removers), spec/nitro/TS/manifest/leg/docs. Runtime proof pending shared-infra network heal (see t-muu8ms26-161y0).
