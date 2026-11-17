---
id: t-mvcy1zgs-1dk90
title: Generate typed iOS SDK facades and shared wire runtime
status: done
owner_status:
  state: landed
  text: 5ae2cafda pushed to tm/one-sdk-docs; focused checks passed; s50803 integrates app/Vite/runtime export, ci-manager owns broader CI
  updated_at: 1792275293846
assignees:
- s50829
labels:
- one-ios-coverage
- typescript
backend: git
commits:
- 5ae2cafda
created_at: 1792274656204
updated_at: 1792275293846
field_marks:
  active_form: 1792274656204
  body: 1792275293846
  claim: 1792274656204
  commit_linked:5ae2cafda: 1792275282642
  evidence_summary: 1792274656204
  owner_status: 1792275293846
  parent: 1792274656204
  priority: 1792274656204
  recovery_ref: 1792274656204
  status: 1792275293846
  title: 1792274656204
---
Assigned by s50803. Implement emit-ts.ts, sdk/wire.ts, focused fake-native tests, and docs naming adapter. Validate strict TypeScript facades for CoreBluetooth, HealthKit, WeatherKit, FoundationModels. Shared tree retained for s50803; ci-manager owns CI. Owner direction quoted in /Users/n8/.team-machine/results/one-ios-generated-sdk-plan.md.

Goal: implement the TypeScript half of generated iOS SDK bindings for lead s50803.
Branch: tm/one-sdk-docs. Commit: 5ae2cafda (Add typed iOS SDK facades), pushed to origin/tm/one-sdk-docs.

Delivered: codegen/sdk/emit-ts.ts exports emitFacade and shared facade naming/formatting. Classes wrap SDKHandle; static initializers return typed wrappers; same-framework inheritance is callable. Enums/options/constants retain union types with companion member helpers. Async/main calls return Promise, out/inout return {$ret,$out}, delegate methods use optional camelCased keys mapped to Swift titles. Cross-framework imports are type-only. Registry decoding wraps loaded types and otherwise uses SDKHandle.
Shared wire runtime handles dates, bytes, handles, callbacks, synchronous callbacks, callable native handles and $impl. src/ios-runtime.native.ts injects a lazy Nitro OneSDK; src/ios-runtime.ts is the fake-testable shared export. Generated facades import one/ios-runtime. Lead owns the package export and app/Vite wiring.
Docs use the same formatter with a complete SDK type index, and include out/inout names.

TESTED: 10 fake-native vitest cases passed via the package test script. Strict source tsc passed. All four current Swift modules generated with zero compiler errors: CoreBluetooth 218 entries, HealthKit 1326, WeatherKit 450, FoundationModels 594. All four TypeScript facades plus the Bluetooth sample strict-tsc passed with nine type-only external framework declaration fixtures; this is not a complete check of those other frameworks. Negative samples rejected numeric UUID filters, misspelled delegates and invalid state strings. A bundled generated Bluetooth probe passed initializer wrapping, inherited state, retained delegate dispatch and scan invocation. All 2588 docs call shapes matched the facade formatter. No simulator runs.
Evidence: /Users/n8/.team-machine/results/one-sdk-ts-validation (generation manifests, facades, tsconfig, sample.ts, invalid-usage.ts, check.ts, check-docs.ts, probe.ts/probe.mjs). Retained for s50803 to inspect.

Typed sample:
import { CBCentralManager, type CBCentralManagerDelegate, type CBManagerState } from 'one/ios/CoreBluetooth'
const delegate: CBCentralManagerDelegate = {
  centralManagerDidUpdateState(manager) {
    const state: CBManagerState = manager.state
    if (state === 'poweredOn') manager.scanForPeripherals(null, null)
  },
}
const manager: CBCentralManager = CBCentralManager.initDelegateQueue(delegate, null)
const scanning: boolean = manager.isScanning

Next: s50803 integrates emitFacade into app/Vite and exposes one/ios-runtime with native/default/types entries. CI owner: ci-manager; broader CI and native device behavior remain with the lead/CI owner. REVIEW: none as assigned.
Shared worktree retained in place for live owner s50803 and co-tenants. All six owned source paths are committed. No owned services, watchers or resource claims remain. No blockers for this lane.
