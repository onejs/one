# Background computation API for approval

One branch `feat/background-computation`; Contrast branch `feat/one-background-computation`.

```ts
// calculate.ts exports a synchronous pure function and imports pure helpers.
import { defineBackgroundComputation, useBackgroundComputation } from 'one/background'
import { calculate } from './calculate'
export const computation = defineBackgroundComputation(calculate)
// component input is memoized; null disables work.
const { result, getCurrent } = useBackgroundComputation(computation, input)
```

`createLatestComputation(computation, changed)` provides the same ownership contract
outside React. It exposes `update`, `getCurrent`, and `dispose`.

One owns the platform executor. Its Vite transform bundles the imported pure module
graph into a native Worklets function and creates the Web Worker entry. No worker
file or native/web executor choice remains in Rally. One shared native runtime and
queue avoid a runtime per render; each web owner has its own worker. Updates
withdraw accepted results immediately. Only the newest revision may publish a
result or error. Disposal prevents publication; it cannot interrupt running native
JavaScript. Hooks throw current errors to a React error boundary.

TESTED: the actual Rally course hook, with 37 starter objects, exactly matched all
seven synchronous course data fields on iOS 27, Android 37 and Chromium. Each
reported `passed revision=1 checkpoints=3 legs=3 objects=37`. Chromium created the
generated worker. This is a real feature mounted in a proof harness, not a claim
that the full playable WebGPU app was exercised. Separate native/web probes
reported runtime identity and accepted only revision 3. Screenshots and repeat
commands are under `tests/native-features/evidence/background-computation`.

Limits: module-scope definitions use a named relative function import. Inputs and
results are plain serializable data; calculations are synchronous and cannot
capture component state or native modules. Native bundling rejects unsupported
runtime dependencies/globals. The transform supports One Vite, including the
default native bundler; Metro is excluded. Worklets must be installed and linked.
Server rendering creates no worker. These are computations while an app is alive,
not an OS job scheduler. Android OS background tasks remain a rank 6 proposal.

The API doc and a ranked platform-duplication survey are included. Next candidates
are proposals only: persistence, speech, restart, material blur, masks, an existing
document-picker migration, and a GPU canvas integration.

Nate approved this shared API and migration directly on 2026-10-03, referencing
share-file-s8381-044922d32c30da74-1a1045f462d-32c3521720f43187. Assigned assembled
review remains with m19584 before merging One v2-beta and Contrast main.


Compiler integration follow-up

The app API remains the approved `one/background` contract. `vxrn/background-computation`
now exposes its browser-safe compiler core: `transformBackgroundComputations(source, id,
{ platform, resolve, workerFactory?, nativeModule? })` returns transformed code, its map,
and generated module descriptors. Vite and Contrast invoke this same function. Contrast
bundles its virtual pure dependency graph into a Worker Blob on web and the same native
worklet loader used by Vite. A separate Node compiler entry validates capture globals and
Hermes loops before Worklets serialization, without importing Vite into Contrast's backend.

RAN: Contrast's raw transform previously emitted an unusable definition (before commit
99f6be087f). It now rejects a missing graph adapter at compile time. TESTED: eight graph
checks cover actual native calculation, helper edits, forbidden globals and runtime
packages, missing optional dependencies, web/native conditional exports, artifact pruning and dynamic requires. RAN: the
full Contrast bundler suite passes 130 tests / 348 assertions; One compiler/plugin passes
39 tests and vxrn typecheck. RAN: the real Rally hook now passes through both custom preview runtimes: a Blob Worker on web and a named Worklet Worker on native preview. All seven fields match the synchronous course, with37 objects and3 checkpoints/legs. Native heartbeat advances to7. This proves the computation feature in a proof screen; full playable game boot is not claimed. The full Home Rally factory seed build remains a release gate.

RAN: the complete canonical Home Rally factory seed reaches the public compile
CDN through the actual factory reader and native build pipeline. It currently
fails because the exact branch `contrast-native` source artifact returns404.
The retained negative receipt is `contrast-preview/factory-before-publication.json`.
This build remains a gate until the published npm family and both compile catalogs
include this branch. Home Rally is a canonical example, not a published registry
entry; no registry entry was added.

Nate directly approved the shared compiler integration and custom-preview proof
via “Rally passes on both custom preview runtimes”
(`share-file-s8381-044922d32c30da74-1a104bc4215-cfea721aa21064ad`).
The publication checks, complete factory seed build and assigned assembled review
remain gates before the follow-up merges. This approval does not claim those
checks have passed.

RAN: compiler integration landed on v2-beta as `c2a262012`, with logical proof
commit `6b5302bdc`. A fresh build passed14 targets and the compiler suite passed39
tests. The automatic Release succeeded. Canary
`2.0.0-0.canary.1791084352120` was verified by packing One, vxrn and compiler:
background exports, browser/native compiler helpers and ESM/CJS worklet utilities
are present; all manifests identify source6b5302bdc.
Contrast's rebased release branch is `feat/one-background-computation-release`;
its whole-family pin and both compile catalogs precede the main merge.
