---
id: t-mvcyihd8-ffv0
title: Retain JavaScript implementations for native weak delegates
status: done
owner_status:
  state: landed
  text: f3a79d62a and generated metadata f8e1a273e; real CoreBluetooth delegate probe passes; ci-manager owns native integration
  updated_at: 1792276932770
assignees:
- s50797
labels:
- lane:one-sdk-generics
- umbrella:one-ios-coverage
backend: git
sessions:
- s50797
commits:
- f3a79d62a
created_at: 1792275425900
updated_at: 1792278802073
field_marks:
  active_form: 1792275425900
  body: 1792276932770
  claim: 1792278802073
  commit_linked:f3a79d62a: 1792275624278
  evidence_summary: 1792275425900
  owner_status: 1792276932770
  parent: 1792275425900
  priority: 1792275425900
  recovery_ref: 1792275425900
  status: 1792276932770
  title: 1792275425900
---
2026-10-17 s50803 direction: "Make the runtime keep every $impl decoded in a call alive for as long as the object it was handed to: associate it with the call self when that is an NSObject (keyed by the setter or parameter, so reassigning replaces it), otherwise with an NSObject result (initializers and factories)." Scope OneSDKRuntime.swift and HybridOneSDK.swift only; lead owns emit.ts and emit-ts.ts. Prove post-autorelease callback and release on reassignment using swiftc. CI owner ci-manager; no review gate.

TESTED: baseline native probe reproduced weak delegate released at call end. After runtime fix, exact HybridOneSDK.call path survives call plus autoreleasepool drain, dispatches callback, releases old implementation on same-slot reassignment, keeps a separate delegate slot, clears nil, releases all on owner destruction, attaches initializer/optional factory delegates to result and replaces them from setter, and preserves active delegate when a later call fails before mutation. Probe compiles actual runtime/Hybrid against Nitro stubs. Evidence /Users/n8/.team-machine/evidence/one-sdk-weak-delegates-s50797. New native table requirement argumentNames(id) requested from lead, who owns emitter.

RAN: commit f3a79d62a pushed to tm/one-sdk-docs. Only assigned runtime and Hybrid paths committed. All weak-delegate probes passed, including optional factory result. OneSDKTable.argumentNames(id) is now required; lead notified to emit parameter names and setter property names. No fallback for stale generated tables. CI owner ci-manager; actual Nitro/Xcode integration pending CI.

# Native weak delegate retention

Runtime commit f3a79d62a, pushed on tm/one-sdk-docs. Generated metadata integration f8e1a273e by lead. Only OneSDKRuntime.swift and HybridOneSDK.swift changed by this lane.

The call records every successfully decoded $impl. After successful table execution, the native sender associates these objects with NSObject self, otherwise the NSObject result observed before wire conversion. Retention slots use generated argument names; property setters use the property name, so init(delegate:) and delegate reassignment share a slot. Reassigning or passing nil releases the previous implementation. Failed calls do not change the receiver association. Implementations from nested collections share their argument slot. Associated storage dies with its native owner; no global owner registry is retained. Optional factory results are unwrapped before owner selection. Replaced implementations release outside the storage lock.

RAN: baseline probe reproduced early weak-delegate release. TESTED: native Swift probe compiles the actual runtime and Hybrid sender, with Nitro stubs. Post-call/autorelease callbacks, replacement, nil, independent slots, owner destruction, initializer and optional factory result retention, setter replacing initializer slot, and failed-call preservation pass.

RAN: regenerated CoreBluetooth from f8e1a273e at nice 10, 218 entries, zero skipped and zero errors left against iOS SDK. Its generated initializer id67 names are [delegate, queue], setter id75 names [delegate]. For the macOS executable, corebluetooth-probe.py copies the exact generated table wrapper, metadata dispatch, two native case bodies, required CBCentralManagerDelegate callback method and factory. Unrelated iOS-only API cases and optional protocol methods are omitted because the full iOS table contains APIs unavailable on macOS. No selected initializer/setter/callback body or metadata is rewritten.

TESTED: corebluetooth-probe runs real CBCentralManager initialization via HybridOneSDK.call. After the call and autorelease drain, its weak delegate is live. Calling its generated centralManagerDidUpdateState callback reaches the JS dispatcher. The generated setter releases the initializer delegate and retains the replacement; its callback also reaches the dispatcher. A generated nil setter releases the replacement. This uses a native dispatcher closure rather than a real JS VM. No Bluetooth scan, simulator, Nitro or Xcode integration run was performed.

Evidence: probe-before.log, probe.swift, probe.log; corebluetooth.log, corebluetooth/OneSDK_CoreBluetooth.swift and .json; corebluetooth-probe.py, corebluetooth-selected.swift, corebluetooth-probe.swift and corebluetooth-probe.log. CI owner ci-manager. Shared tree retained by lead s50803; assigned source paths clean; no owned services or waits remain.
