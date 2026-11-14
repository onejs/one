---
id: t-mv26d7x8-vgr0
title: 'Review landing-gate: native NavigationSplitView and List selection/tag API on v2-beta'
status: done
labels:
- lane:one-v2
backend: git
created_at: 1791623489372
updated_at: 1791624190423
field_marks:
  active_form: 1791623489372
  body: 1791624190423
  claim: 1791623489372
  evidence_summary: 1791623489372
  owner_status: 1791623489372
  parent: 1791623489372
  priority: 1791623489372
  recovery_ref: 1791623489372
  status: 1791623525926
  title: 1791623489372
---
REVIEWED HEAD 215624cc9: no NavigationSplitView component and no List selection/tag API exist on v2-beta, so there is nothing to approve and nothing unreviewed landed. Only navigationSplitViewStyle/column-width style modifiers exist (generated controlTypes.ts + OneNativeStyle.swift). ListProps (listTypes.ts), OneNativeList spec, Containers.native.tsx List, and 75-line OneNativeListView.swift carry no selection/tag; Android has no SplitView/selection. Design docs keep SplitView out of scope (components.md, navigation-design.md:320). No branches or tasks carry such work. Docs ios-lists/ios-navigation match code, no doc fix. Approval of any future public API stays with owner/Nate. No commit pushed; tree clean.

CORRECTION from owner p74343: the no-branches/tasks claim is wrong. The candidate exists as pushed tm/expo-mail-one-native-review@5a4e31de929f65bd0ff1c11d205176f3227d93be (local + origin), preserved in /Users/n8/.worktrees/one-expo-mail-one-native-review; source author p73548 under p73456, integration s27204. Verified commit 5a4e31de9 feat(one): add native split view selection adds OneNativeNavigationSplitView native component + NavigationSplitView.native.tsx, List selection (listTypes, List spec, OneNativeListView.swift), NavigationStack changes, ios-lists/ios-navigation docs, lists + navigation tests, and codegen catalog/emitter/schema changes. Earlier v2-beta-HEAD findings stand only for v2-beta HEAD, not for this branch. Public API approval belongs to Nate. No review gate added, no re-verification, no landing; preserved tree left intact.
