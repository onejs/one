---
id: t-mvkuqa74-lkx0
title: Repair native bundle global scope used by Mac consumer
status: done
assignees:
- s69797
labels:
- one-macos-native
parent_id: t-mvknc99k-k8t0
backend: git
sessions:
- s69797
commits:
- 225fd27d9447c99534be74633cb332cd6e97a55e
- 3779e524c60cee91c23bed5fbd75623c323ba42b
created_at: 1792752800800
updated_at: 1792753566612
field_marks:
  active_form: 1792752800800
  assigned:s69797: 1792752916706
  body: 1792753566612
  claim: 1792753505207
  claim_current:822fdc9aba076965442b7d75de6b760b: 1792753505207
  claim_state:2185f1772a5d9181a00b61bbe69b1d6e:1792752830759:=s69797:=mc-3aa87nk0z4j17:1792752830759:f: 1792752830759
  claim_state:822fdc9aba076965442b7d75de6b760b:1792753505207:~:~:~:o:2185f1772a5d9181a00b61bbe69b1d6e: 1792753505207
  commit_linked:225fd27d9447c99534be74633cb332cd6e97a55e: 1792753426121
  commit_linked:3779e524c60cee91c23bed5fbd75623c323ba42b: 1792753426196
  evidence_summary: 1792752800800
  owner_status: 1792752800800
  parent: 1792752800800
  priority: 1792752800800
  recovery_ref: 1792752800800
  status: 1792753426366
  title: 1792752800800
---
Actual ControlRoom raises nonconfigurable RN global polyfill errors. Both producer eeb26145c7 and current main already contain wrapNativeBundleModuleScope. Diagnose why actual served output leaks script scope before adding code; either repair existing wrapper or prove stale installed output and hand exact correction to lead. Scope vxrn JS bundle/runtime only. CI ci-manager.

# Native dev bundle scope (task t-mvkuqa74-lkx0)

Fix: tm/macos-resume 225fd27d94, fixture repair 3779e524c6 (vxrn createNativeDevEngine.ts + test only).

RAN: own one dev --port 4391 from gui/macos (installed vxrn 2.9.0, rolldown 1.2.15). Served bundle
controlroom-served-before.bundle.js (sha256 e42209b999e67981c0aefc8b42c4485eec630d9d9a3abf6c6cb44a8593f2bc77) has no ';(function() {' opener; runtime header is
'// \0rolldown/runtime.js' at line 111; 'var EventTarget_hot, EventTarget, ...' at script scope line 19653.
Installed dist is current (contains wrapNativeBundleModuleScope); it was not stale.

RAN: rolldown 1.2.8 and 1.2.13 emit '//#region <id>' ... '//#endregion'; 1.2.15 emits '// <id>' with no endregion.
vxrn depends on rolldown ^1.2.8, so fresh installs get 1.2.15. Wrapper and class-field downlevel keyed on
'//#region \0rolldown/runtime.js' and silently returned the bundle unchanged. Class fields were also left raw.

Repair: dev prelude ends with '// vxrn: native module scope'; runtime region ends at the vxrn HMR runtime's
final statement. Both passes throw if their marker is missing. Production renderChunk no longer runs the
downlevel (its runtime has no classes, checked with iife probe).

TESTED: createNativeDevEngine.test.ts 174/174 on 1.2.13 and with rolldown aliased to the consumer's 1.2.15
(suite-rolldown-1.2.13.log, suite-rolldown-1.2.15.log). Stale prelude fixture fixed in 3779e524c6: bound
(native-printing) callable is cleared, a separate JS function control is kept. scope.test.ts on 1.2.15: opener ';(function() {// vxrn: native module scope', no class field left.

Not done: no app run of ControlRoom on the fix. Lead correction: install vxrn from 225fd27d94 into gui/macos
(bun release --into), restart the 4380 server, confirm 'Failed to set polyfill' is gone.

Replay (from packages/vxrn in the tree):
  npx vitest run src/utils/createNativeDevEngine.test.ts
  npx vitest run --config /Volumes/Samsung-1TB-990/evidence/one-macos-native-scope/vitest.rd115.config.mjs --root . src/utils/createNativeDevEngine.test.ts
  npx vitest run --config /Volumes/Samsung-1TB-990/evidence/one-macos-native-scope/probe/vitest.config.mjs --root /Volumes/Samsung-1TB-990/evidence/one-macos-native-scope/probe --reporter=verbose --silent=false
The rd115 configs alias rolldown to gui/macos/node_modules/rolldown (1.2.15) in the TM live-flow worktree.

Independent lead Sol review APPROVED225fd27d94/3779e524c6: read actual dev-output wrapper/downlevel boundaries, production runtime path and preserved source-map line handling, fixture native/JS distinction. Disproof probe enhanced author actual1.2.15 engine output with VM script execution: real entry executed, module EventTarget was absent from global, Object.defineProperty lazy host EventTarget installed successfully, global runtime object reachable, no raw class fields. Passed1 probe via installed local vitest under heavy admission. Evidence /Users/n8/.team-machine/evidence/one-macos-resume-s69213/bundle-scope-review.log and /Volumes/Samsung-1TB-990/evidence/one-macos-native-scope/probe/lead-scope-runtime.test.ts. Hostless probe intentionally lacks RN WebSocket so HMR reports missing init_WebSocket, no full-native HMR claim. Full consumer install/acceptance s69811 remains separate.
