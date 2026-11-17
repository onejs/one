---
id: t-mvduijh9-16lj0
title: Pass SDK call arguments as Nitro or JSI values, benchmarked against a direct Nitro module
status: done
owner_status:
  state: landed
  text: b117da0f1 on origin/tm/one-sdk-docs
  updated_at: 1792346023752
assignees:
- s52033
labels:
- one-ios-sdk
- pr-961
parent_id: t-mvd7hx3j-14wo0
backend: git
sessions:
- s52033
commits:
- 11c0e9817
- b117da0f1
- e56c8551e
created_at: 1792329176349
updated_at: 1792346112646
field_marks:
  active_form: 1792329176349
  assigned:s52033: 1792330733643
  body: 1792346060444
  claim: 1792346112646
  commit_linked:11c0e9817: 1792346023496
  commit_linked:b117da0f1: 1792346023556
  commit_linked:e56c8551e: 1792346023396
  evidence_summary: 1792329176349
  owner_status: 1792346023752
  parent: 1792329176349
  priority: 1792329176349
  recovery_ref: 1792329176349
  status: 1792346023752
  title: 1792329176349
---
launch pending on air-32 (lt-058a71bd18e89003545a065f9275d5ef, slug one-sdk-nitro-args, group lg, worker permissions); do not relaunch until resolved

running as s52033 (one-sdk-nitro-args3, studio-64). Earlier federated attempts lt-058a71bd18e89003545a065f9275d5ef (air-32) and lt-0a2ec8a667ac5f8940bdc7ab3ecc0fe8 (pro-128) never confirmed (tm-defect t-mvdv1tp5-2cl0); if either starts later, stop it as a duplicate.

Committed and pushed e56c8551e to origin/tm/one-sdk-nitro-args3. TESTED on iPhone 17 Pro iOS 27.0 simulator (715F6553-2F11-4315-9D0C-D19F18973DBB, Debug): HealthKit getter 16.459 us (2352 B/call) -> 3.628 us (528 B/call), ProcessInfo low-power getter 16.436 us (2296 B/call) -> 2.951 us (472 B/call), Bundle info read 24.999 us (2720 B/call) -> 7.791 us (600 B/call) vs 2.267 us (56 B/call) direct Swift getter (within 3.4x), UIKit struct+string call 31.972 us (5984 B/call) -> 5.397 us (632 B/call), NSCoder CGRect->string 32.235 us (5808 B/call) -> 6.473 us (592 B/call), UserDefaults string read 21.877 us (2720 B/call) -> 5.073 us (600 B/call), Data ArrayBuffer round-trip 27.458 us (3544 B/call) -> 5.119 us (704 B/call). Passed wire.test.ts (17), react.test.ts (4), observation.probe.swift, and 4 Maestro flows (sdk-regression, spike, one-native-ios-unified-network, one-native-ios-unified-clipboard). Aborted merge of origin/tm/one-sdk-docs due to conflict with eb36b2d40 in OneSDK.nitro.ts, wire.ts, OneSDKRuntime.swift, HybridOneSDKSpec, and README.md; waiting on s50803 authorization to resolve and push to tm/one-sdk-docs.

Merged origin/tm/one-sdk-docs (eb36b2d40 and a75c7ce4c) into tm/one-sdk-nitro-args3 and fast-forwarded origin/tm/one-sdk-docs to b117da0f1. Reran wire.test.ts (18 pass), react.test.ts (4 pass), and observation.probe.swift on iOS 27.0 simulator. Generated Nitrogen Swift files in packages/one/nitrogen/generated/ios/swift/ were added and removed (OneSDKValue.swift, OneSDKRect.swift, OneSDKPoint.swift, and updated Func_* wrappers), so prebuild/pod install is needed on the next shared refresh.

REVIEW: s50803 ok on b117da0f1 (both sides of the eb36b2d40 and a75c7ce4c merges kept). The next shared refresh picks it up for native.
