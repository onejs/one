# Background computation API and migration

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

The shared API and migration are approved (2026-10-03). Assigned assembled
review passed. One API and compiler are on v2-beta. RAN: Contrast migration and
cache follow-up are on main, with final merge a7b1c5c3c66 landed by main-sync.
The scoped tool guard blocked this lane's main push; the assigned owner completed it.


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
39 tests and vxrn typecheck. RAN: the real Rally hook now passes through both custom preview runtimes: a Blob Worker on web and a named Worklet Worker on native preview. All seven fields match the synchronous course, with37 objects and3 checkpoints/legs. Native heartbeat advances to7. This proves the computation feature in a proof screen; full playable game boot is not claimed. The full Home Rally factory seed build has since passed against published packages.

RAN: the complete canonical Home Rally factory seed now passes through the actual
factory reader and published native build pipeline: 15 routes, 427 files,
14,391,496 bytes and a complete graph. The earlier exact contrast-native source
artifact 404 is retained as a negative receipt. Both compile catalogs now serve
the pinned family. Home Rally is a canonical example; no registry entry was added.

The shared compiler integration and custom-preview proof are approved.
The publication, complete factory build and final merge-candidate checks passed.
Assigned adapter review and re-review passed. RAN: Contrast main now contains
migration/pin df23ed5000 and the composed geometry reuse hook88970f9985, with its
goals row removed. Main-sync p58675 landed final follow-up a0bbcb5b92 with merge
a7b1c5c3c66: retain the module-scope One definition and reject stale completions
before caching. No API
shape changed. TESTED: current cache/edits/stale/disposal proof passes Chromium,
WebKit and native preview; RAN bun check46.7s and complete450-file factory pass.
Repeat commands and observations are in contrast-preview/geometry-reuse/.

RAN: compiler integration landed on v2-beta as `c2a262012`, with logical proof
commit `6b5302bdc`. A fresh build passed14 targets and the compiler suite passed39
tests. The automatic Release succeeded. Canary
`2.0.0-0.canary.1791084352120` was verified by packing One, vxrn and compiler:
background exports, browser/native compiler helpers and ESM/CJS worklet utilities
are present; all manifests identify source6b5302bdc.
Contrast's rebased release branch is `feat/one-background-computation-release`;
its whole-family pin and both compile catalogs precede the main merge.

TESTED: final reviewed Contrast8f3896a221 passes actual WebKit and Chromium
Rally with57 objects/four checkpoints/four legs, exact seven-field comparison
and Blob URL release after first reply. Native preview matches with heartbeat9.
RAN:131 tests/356 assertions, bun check58.8s,97.0KB gzip budget and complete
450-file factory graph pass. Review-fix negative controls and current receipts
are under tests/native-features/evidence/background-computation/contrast-preview/.
No candidate primitive from the ranked survey was implemented. Android OS
background tasks remain a rank6 proposal. No full playable game boot, heap
collection or fresh full phone build is claimed by this final follow-up.
