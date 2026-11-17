---
id: t-mv1c1kch-1pdl0
title: Prove One Android native API suites
status: done
assignees:
- m28192
labels:
- branch:v2-beta
- lane:one-native-android-suites
- umbrella:plans/one-native-android-lane.md
priority: 3
backend: git
sessions:
- s23939
commits:
- 041a3e9e0
- 373a64118
- 4d04e970b
- 53f8ae04f
- 5631018c4
- 82d521e03
- d3acf3fcb
- d805dc57e
- e15ebde65
- f1d80284cb3ec82ca69a1b2899c72824fd5f36c4
created_at: 1791572557121
updated_at: 1791593331854
field_marks:
  active_form: 1791572557121
  assigned:m28012: 1791574492766
  assigned:m28192: 1791583620279
  body: 1791593331854
  claim: 1791572557121
  evidence_summary: 1791572557121
  owner_status: 1791572557121
  parent: 1791572557121
  priority: 1791572557121
  recovery_ref: 1791572557121
  status: 1791593331831
  title: 1791572557121
  unassigned:m28012: 1791583620279
  unassigned:s23939: 1791574492766
---
Owner m28192; Android implementation accepted and pushed to One v2-beta: state f1d80284, Network d3acf3fcb, DocumentPicker e15ebde65, LaunchScreen 373a64118, adaptive-flat 4d04e970b. Every suite has passing, failing negative control and restored passing receipts in plans/one-native-android-lane.md. Network callbacks and adaptive decor-layout monitoring are repaired; arm64 native compilation passes. Generated COVERAGE reflects all owned exports and retains hardware/folding limits. Runtime receipts remain /tmp/one-android-hooks-m28192 on air-32. Adaptive local downstream release into shared Contrast pending. Work now uses shared ~/one beta, shared Contrast one-native. CI owner s23249 retains Android Native Build, Checks and Tests, canary artifact delivery and released-content checks; worker does not monitor unrelated CI.

Implementation complete: all five assigned suites landed, 55 positive checks plus failing controls and restored passes. Adaptive downstream release w-47a8bf built/installed 17 packages and matched Kotlin. Private One/downstream worktrees removed; own emulator, Metro and Gradle stopped. Shared beta and Contrast one-native stay with p73233. Delivery follow-up remains under CI owner s23249; native builds, checks and canary artifact verification pending there.
