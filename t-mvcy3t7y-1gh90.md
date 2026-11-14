---
id: t-mvcy3t7y-1gh90
title: Implement JavaScript SDK protocol witnesses
status: done
owner_status:
  state: landed
  text: 0ffb0dfac pushed to tm/one-sdk-docs; 101 implementations, 140 protocols dropped with reasons; seven modules zero errors; host runtime/isolation/regression probes and strict TypeScript pass; CI ci-manager, production t-mvcyedw3-4wh0; shared tree retained for s50803
  updated_at: 1792275259795
labels:
- lane:one-sdk-protocols
- umbrella:one-ios-coverage
backend: git
sessions:
- s50831
commits:
- 0ffb0dfac
created_at: 1792274741422
updated_at: 1792275391165
field_marks:
  active_form: 1792274741422
  body: 1792275259795
  claim: 1792275391165
  commit_linked:0ffb0dfac: 1792275234439
  evidence_summary: 1792274741422
  owner_status: 1792275259795
  parent: 1792274741422
  priority: 1792274741422
  recovery_ref: 1792274741422
  status: 1792275259795
  title: 1792274741422
---
2026-10-17, scoped assignment from s50803: "let JavaScript implement SDK protocols (delegates, observers, data sources) in the generated Swift bindings." Deliver emitter, runtime factories, compile rejection isolation; validate seven modules and CBCentralManagerDelegate runtime probe. REVIEW: none. CI owner ci-manager. Shared tree retained for lead.

Generated 101 implementations; dropped 140 protocols with explicit reasons.

CoreBluetooth: 3 implementations; 0 protocols dropped; zero Swift errors
HealthKit: 2 implementations; 3 protocols dropped; zero Swift errors
WeatherKit: 0 implementations; 0 protocols dropped; zero Swift errors
FoundationModels: 0 implementations; 12 protocols dropped; zero Swift errors
UIKit: 89 implementations; 121 protocols dropped; zero Swift errors
MapKit: 5 implementations; 2 protocols dropped; zero Swift errors
CoreLocation: 2 implementations; 2 protocols dropped; zero Swift errors

Dropped protocols by reason:
14: protocol with associated types
3: inherited protocol graph unavailable
64: non-method protocol requirement
44: synchronous protocol result requires an active JS-thread call; delegate invocations can escape it
1: compile: type 'OneSDKImpl_UIKit_UIHoverEffect' does not conform to protocol 'UIHoverEffect'
10: nonescaping protocol callback cannot use the async dispatcher
3: async protocol requirement
1: compile: type 'OneSDKImpl_UIKit_UIPopoverPresentationControllerSourceItem' does not conform to protocol 'UIPopoverPresentationControllerSourceItem'

Optional unsupported requirements are separately reported in generated module JSON. Non-Void requirements are unavailable because the existing synchronous dispatcher permits only active JS-thread calls, whereas protocol invocations escape those calls.

TESTED: Seven modules compile against the iOS simulator SDK. No simulator launched. Host swiftc runtime probe decodes $impl, forwards centralManagerDidUpdateState(_:) after call expiry and on a background thread, and answers false for an omitted optional selector. The host probe excludes two optional methods unavailable in macOS; the complete iOS class is in CBCentralManagerDelegate.swift. It allocates a manager without starting Bluetooth.

TESTED: Plain Swift protocol witness, associated-type and return-valued rejection reasons, missing/unknown/malformed/wrong-protocol references, nested optional decoding, isolated compile rejection, and existing synchronous callback/callable/inout runtime regression. Strict TypeScript compile passed.

Limits: Actual Bluetooth connection callbacks and native weak-delegate ownership have not been exercised. Native APIs using weak delegate references require a separately retained implementation; this wire format does not add JavaScript-owned native lifetime management.
