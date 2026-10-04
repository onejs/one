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
99f6be087f). It now rejects a missing graph adapter at compile time. TESTED: six graph
checks cover actual native calculation, helper edits, forbidden globals and runtime
packages, missing optional dependencies, and web/native conditional exports. RAN: the
full Contrast bundler suite passes 128 tests / 344 assertions; One compiler/plugin passes
39 tests and vxrn typecheck. Real custom-preview Rally runtime proof is still being run.
