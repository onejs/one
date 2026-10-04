# Background computation assembled review

Assigned reviewer: m19584. Candidate Contrast merge/one-background-computation-final
8f3896a221d7d05a64b0bcc5cee47533fa807206, worktree
`/Users/n8/.worktrees/contrast-contrast-background-computation-final`.
Base main4def3f39bd; published featurefd086fc8e4; subsequent review fix8f3896a221.
Nate directly approved the API and shared compiler/custom-preview integration
in the two shares recorded in one-background-api-proposal.md. One main is untouched.

Both requested changes to prior candidateb5f14fddd are addressed. The shared
resolver defaults are restored. Browser/import conditions are scoped to
one/background and its pure computation graph, with lazy resolver allocation.
An unrelated conditional package retains its original ordinary web/native
resolution; nested browser/import conditions select the computation contract.
Worker Blob URLs now remain valid through startup and release on first message,
error or disposal; constructor failure also releases its URL.

TESTED: restoring each reviewed behavior separately fails a runtime assertion:
global defaults change an unrelated package's value, and immediate URL revocation
releases before the reply. Candidate is restored in finally before fresh gates.
Actual WebKit and Chromium run the real Rally hook and both observe
firstMessage=true, revoked=true, revokedBeforeMessage=false for one Blob Worker.
Both match all seven fields for57 objects/four checkpoints/four legs. Native
preview matches the same course on a named Worklet Worker with heartbeat9.
The optional fixture CLI WebSocket404 is identified; no application errors or
failed application HTTP requests appear. Screenshots were inspected.

RAN: full bundler suite131 tests/356 assertions; bun check passes58.8s; browser
worker budget97.0KB gzip under100KB. The complete canonical Home Rally factory
passes15 routes/450 files/14,457,330 bytes with graphComplete true, native module
identity, Rally definition and generated native computation module asserted.
All gates ran through bun heavy on candidate8f3896a221. Evidence:
`tests/native-features/evidence/background-computation/contrast-preview/review-fixes/`.
Full check:heavy, full playable game boot and a full phone rebuild are not claimed.

Review the feature diff from main4def3f39bd, particularly
`packages/contrast-bundler/src/{graph,transform,bundler}.ts`, compile/worklets.ts,
background-computation.test.ts, Rally definition/hook and deleted app executors
and contrast-native background package. Vite and Contrast call the same portable
vxrn core. Pure-graph guards, native helper invalidation, pruning and native
serialization are covered by the suite. No parser/transform copy is introduced.

One API4395848b3, output-retention fix75982e8ee, shared compilerc2a262012 and
proof6b5302bdc are already on v2-beta. You reviewed original75e1916d0/fe0484e86f
and approved compiler30bcc005b. Original real Rally proofs passed on iOS27,
Android37 and Chromium. Current errors, latest-revision ownership, disposal,
SSR and output-reference retention have separate runtime receipts.

RAN: npm family2.0.0-0.canary.1791084352120 packed contents contain one/background,
both vxrn compiler entries and compiler worklet utilities. Each manifest identifies
source6b5302bdc; installed changed files match hashes. Automatic Release succeeded.
Both public compile catalogs serve the exact pin. Current and legacy native source
descriptors respond200 for both configurations. The same Contrast merge contains
family pin37d5b7ac11 and native locks470fda43fc. Pod fingerprint is unchanged and
runtime84 stands. Previous exact-pin checks passed both template typechecks and
seed/dependency checks; fresh bun check includes affected template checks.

API doc: apps/onestack.dev/data/native/background-computation.mdx. Ranked next
primitive survey: plans/one-native-launch.md rank5; Android OS tasks are a rank6
proposal. Nothing new from that list is implemented. Expected Contrast CI after
main push: pin/catalog cutover, factory and package/template checks. Manager owns
that watch unless assigned here. No known failure remains after these fresh gates.

Disposition: m19584 re-review passed8f3896a221. RAN: Contrast main contains
the reviewed migration/pin df23ed5000 and composed hook88970f9985. The guard
prevented this One-scoped session's main push; m19584 assigned main-sync p58675.

Following the requested main conflict composition, main's geometry reuse remains
at module scope. Follow-up a0bbcb5b92 checks isCurrent after awaited execution,
preventing a superseded completion from replacing the exact accepted cache.
TESTED: actual Chromium, WebKit and native preview produce
reuse=2 stale=1 edits=2 owners=2 calls=6 disposals=2, full synchronous course
comparison and exact admission identity. Both browser Workers reply before Blob
URL retirement. Cache and stale guards removed in virtual source fail distinct
computation-count assertions. RAN:131 tests/356 assertions, Home typecheck,
bun check46.7s and complete factory15 routes/450 files/14,469,639 bytes pass.
Evidence: contrast-preview/geometry-reuse/. No new API or executor path.

RAN: main-sync p58675 merged fix/rally-background-cache-owner into Contrast main
as a7b1c5c3c66. Validated a0bbcb5b92 is in that merge and fetched main7ef5bbf301
contains it. Main's hook blob matches the validated source exactly. Original
migration and final cache fix are landed. Global defect t-mutdjr1u-v5o0 records
the tool attribution failure; manager/coordinator owns subsequent CI.
