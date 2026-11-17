---
id: t-mvfqrnu3-1spk0
title: Bridge asynchronous native callbacks and protocol witnesses
status: done
assignees:
- p95796
labels:
- lane:one-sdk-docs
- one-ios-coverage
parent_id: t-mvfqpuri-1hf80
backend: git
created_at: 1792443815787
updated_at: 1792454440067
field_marks:
  active_form: 1792443815787
  body: 1792454440067
  claim: 1792443815787
  evidence_summary: 1792443815787
  owner_status: 1792443815787
  parent: 1792443815787
  priority: 1792443815787
  recovery_ref: 1792443815787
  status: 1792454440067
  title: 1792443815787
---
Lead-owned implementation slice. Existing runtime has void async OneSDKDispatch, same-JS-thread sync response, and native OneSDKCallable handles callable asynchronously from JS. Evaluate/use one-shot native reply callable carried in existing event envelope to await JS Promise result without blocking native main or changing Nitro interface. Then enable correctly representable async protocol requirements/callbacks, preserving sync unsupported constraints, ownership/error/cancellation semantics and strong runtime behavior checks. Own runtime/wire/emit-protocols; Opus owns bridge/emit/emit-ts and applies agreed policy hunks. No silent native defaults, no JS-thread deadlock, no new public API absent actual choice. Peer review Opus. Changes affect SDK fingerprint and require coherent artifact regeneration after source stabilizes, not per edit.

RAN implemented OneSDKFunction.responseAsync/resultAsync with one-shot reply callable through existing dispatch envelope; no Nitro spec changes. TESTED actual OneSDKRuntime.swift compiled and executed macOS probe: resolved value, JSerror, native cancellation, duplicate/late reply, concurrent replies isolated. TESTED real wire21checksPASS incl delayed Promise, buffer result, thrown callback and unencodable result error forwarding. Swift runtime typecheck and package tscPASS. emit-protocols async-throws witness WIP awaits Opus-owned bridge/TS policy seams before full integration claim. No app/native-table artifact rebuild yet. Evidence ~/.cache/one-sdk-docs/native-async-review/{native.log,wire.log,package-typecheck.log,Probe.swift}.

TESTED actual Swift compiler module+symbolgraph through generated AsyncDelegate protocol factory and OneSDK_AsyncFixture.async table using real OneSDKRuntime.swift. Native async call suspends for reply; success and JS failure both propagate. Probe run-generated.sh PASS (first harness had a Double-vs-Int assertion error, corrected to actual wire numeric representation; no source change needed). Peer review requested from existing Opus p96232 for bounded four-path source diff. Async result admission remains its bridge policy seam; nonthrowing async remains excluded.

Source committed908f4e6777 after Opus peer review. One-shot async reply lease now rejects malformed replies and dropped reply handles; actual runtime probe passes both plus cancellation/concurrent/late/duplicate cases. Generated Swift and Objective-C protocol calls plus required/optional async-throws closure arguments execute through the emitted table with value and rejection; optional omitted callback follows native default. SDK+wire13files82checksPASS and package tscPASS. Artifacts intentionally not yet regenerated; no coherent new SDK delivery claimed.

Additional bounded investigation while w-8bac38 runs: actual newly admitted SDK async protocols remain excluded where inherited Swift.Sendable has no graph. Lead RAN SDK interface Sendable/SendableMetatype are @_marker empty requirements; public Nitro void Dispatch is AsyncJSCallback queueable from any thread, while existing synchronous path remains thread/active-call gated. Existing Opus is investigating an outside-tree compiler candidate and Sendable state audit. No source/fingerprint edits made, no claim these SDK protocol factories already ship, no arbitrary inherited protocol ignored.

Sendable followup8ee66d5fd5 committed after Opus approval426. Only exact Swift.Sendable and SendableMetatype marker usrs bypass missing inherited graph; arbitrary unknown inherited protocol negative control still rejects. Only audited immutable OneSDKFunction is unchecked Sendable; generated witness remains compiler-checked. TESTED witness fails Swift6 strict concurrency against original callback wrapper and passes with fixed runtime; actual generated Sendable instance responds to two concurrent background calls with isolated results. Opus MusicKit/AccessoryNotifications candidate proves3 newly emitted factories. Obsolete w-8bac38 canceled before source edit, owned process/children gone; no artifacts from that job accepted.

TESTED peer verdict received, p96232 mail426: APPROVE 8ee66d5fd5. Actual OneSDKRuntime.swift is byte-identical to independently compiled mirror; emit-protocols differs only comment wording and keeps exactly two marker USRs. No witness unchecked annotation; other unknown inherited protocols still rejected. Swift5/6 generated-witness proof reused. Coherent 290 producer w-91453a remains the exact artifact dependency; no new artifact or native acceptance claimed.

Candidate delivery complete and pushed: source8ee66+SPA4adc, generated artifacts92ccd94ee3, reference49fa68de69; PR975 https://github.com/onejs/one/pull/975. TESTED matching rebuilt SDK bundle/facade ABI212edf3d13b127f5, built public runtime export dispatch, packed closure/iOS resolution8/8 PASS (w-ca83ab). Package and SDK fixture tsc PASS (w-7c0e01). Generated reference290 modules/23454 type names, protocol-only Combine calls corrected. Independent source/artifact peer approval p96232 accepted; non-gating followups t-mvftomx8-13ad0 and t-mvftoncg-13fr0 recorded. Lead owns exact branch CI and canary delivery; stable publication remains held for renewed owner approval.

RAN approved PR975 merged into main as28cc4531bbc4fa1e392a92dc05529d318278d832. Stable Release39341475834 completed SUCCESS. Scoped runtime/protocol/wire changes and docs producer plus290-framework reference refresh are landed; no source work pending. Published package verification remains separately owned by p95796 under t-mvfqhp76-1rl70.
