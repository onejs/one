RAN: assigned reviewer m19584 requested two changes to candidateb5f14fddd:
web defaults changed every graph, and immediate Blob URL revocation threatened
Worker startup. Candidate8f3896a221 restores the shared resolver defaults and
limits browser/import conditions to one/background and the pure computation
subgraph. Native resolution and ordinary web modules retain their original path.
The scoped resolver is allocated lazily. URL revocation now waits for first
message, with cleanup on error, disposal and Worker constructor failure.

Nine adapter tests pass. negative-controls.json retains actual failed runs after
restoring each reviewed behavior separately: the global-default control changes
an unrelated conditional package's runtime value, and the immediate-revoke
control releases its URL before a Worker startup reply. Each control exits1;
the candidate was restored in a finally block before running fresh gates.

The real Rally probe now additionally instruments Blob URL lifetime and asserts
one worker, its first reply, URL release and absence of pre-reply revocation.
TESTED: actual WebKit and Chromium each execute the real Rally hook in a Blob
Worker and match all seven fields for57 objects/four checkpoints/four legs.
Each observes firstMessage=true, revoked=true, revokedBeforeMessage=false,
without browser errors or failed HTTP requests. Native preview uses the named
Worklet Worker, matches the same course and reaches heartbeat9. Its optional
fixture CLI WebSocket404 remains identified, without application errors.

RAN: 131 bundler tests/356 assertions and bun check pass (58.8s). Browser worker
budget passes97.0KB gzip under100KB. Complete canonical Home Rally factory
passes15 routes/450 files/14,457,330 bytes with graphComplete true and native
identity/generated module assertions. All full gates ran through bun heavy on
source8f3896a221. Screenshots were inspected. checks.json records exact outcomes;
proof.json and webkit-proof.json retain worker and URL lifecycle observations.
Scope remains the real calculation screen and complete factory bundle, without
a claim of full playable game boot, full phone rebuild or full check:heavy.
