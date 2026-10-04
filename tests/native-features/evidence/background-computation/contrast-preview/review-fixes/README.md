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
Actual WebKit, Chromium/native preview, complete factory, full bundler suite,
fast checks and browser bundle budget are running. No results are claimed yet.
