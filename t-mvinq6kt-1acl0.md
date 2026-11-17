---
id: t-mvinq6kt-1acl0
title: Reject unsupported macOS package imports during bundling
status: done
owner_status:
  state: landed
  text: 86324f60ce on tm/one-macos; macos-lead-2 review, ci-manager delivery
  updated_at: 1792620262171
assignees:
- p103066
labels:
- macos-resolution
- one-macos
backend: git
sessions:
- p103066
commits:
- 86324f60ce185f500f2307dd86d96e85dbd4af93
created_at: 1792620106445
updated_at: 1792620262171
field_marks:
  active_form: 1792620106445
  body: 1792620262171
  claim: 1792620106445
  commit_linked:86324f60ce185f500f2307dd86d96e85dbd4af93: 1792620261814
  evidence_summary: 1792620106445
  owner_status: 1792620262171
  parent: 1792620106445
  priority: 1792620106445
  recovery_ref: 1792620106445
  status: 1792620262171
  title: 1792620106445
---
Reproduce platform-only expo-ghostty import externalization, fix macos paths only, validate focused fixture, push tm/one-macos for macos-lead-2 review. CI owner ci-manager.

TESTED: fake expo-ghostty index importing ./GhosttyView with only ios/android/web variants emitted a bare ESM import before the fix; after fix getBundle rejects with package/import diagnostic. One defines integration file: 6 passed. git diff --check passed. RAN: native.app Expo prefix externalization was unconditional; macos static imports now resolve normally, optional require externals preserved. Removed macos runtime platform stubs in favor of build errors; unresolved import warnings become errors in the macos-only plugin. INFERRED: ios/android/web emitted bytes unchanged because all runtime edits are gated to macos (no broad bundles built by assignment). reactNativeCommonJsPlugin optimizer has ios/android environments only; native macos engine uses its own getNativeResolveConfig, so getNativeExtensions(ios) does not apply. Expected CI is branch workflow validation; CI owner ci-manager. Review owner macos-lead-2. Shared checkout retained for lead/host worker; no owned persistent services or children.
