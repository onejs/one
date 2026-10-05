# ProtectedStore candidate evidence

TESTED: The verifier passes 92 checks over 64 actual native results and 134
controller events. The source producer is
`94d765a567e56b6c813e6d3dc977603792fe6c07` on
`tm/protected-store-implementation`. This receipt commit changes only the proof
harness, evidence and implementation plan. Production source is unchanged.

RAN: The actual One Kotlin, C++ registration and generated Nitro bridge compiled
in an arm64 NativeFeatureTests APK. Package and harness TypeScript checks passed.
The production APK pulled from the device matched its build SHA256
`921cbd5f5396f8da4201ec381136c635f97b3413154abb2feb622b2fd1d4bcec`.
The separate fault APK SHA256 is
`9d73d76dcda1e17f5b06590e274a31773714938097d8ef843a7ecaa08f55c586`.
The permission-omitted APK has its own identity receipt. Preserved APK masters
live under `/Users/n8/.team-machine/handoffs/protected-store-native-*.apk`.
`production-identity.json` pins changed source hashes and the actual framework.
`fault-source.kt` and `fault-source.json` preserve the copied production source
with four bounded injections. The final harness renames that generated copy to
`ProtectedStoreFaultProof.kt` to make Gradle source selection unambiguous; the
captured source content and APK identity remain the original producer.

TESTED: Both policies create without a prompt, authenticate reads and updates,
reject duplicate names and policy mismatch, and preserve long UTF-8 exactly.
Fresh PIN and newly enrolled fingerprint reads work for userPresence. The
current-set item rejects reads and updates after enrollment changes; its
ciphertext remains unchanged until an authenticated explicit delete allows a
new key and name reuse. Metadata weakening rejects POLICY and authenticated
ciphertext tampering rejects GET. Restoring the owned fixture permits a fresh
read. These controls would fail on relaxed policy, successful tampered reads,
lost bytes or unchanged key identity after deletion and recreation.

TESTED: Locked existing and alias-only get/update/delete reject AUTH without a
prompt. Missing means both key and record absent and retains its three distinct
results even while locked. All four calls reject MANIFEST in the permission-
omitted application. Cancellation, destroy callback delivery, Home, generation
change and failure before AtomicFile commit preserve prior ciphertext. Two
concurrent bridge calls produce separate serialized reasons and outcomes.
A returned CryptoObject uses the identical cipher; consumed-cipher and fresh-
cipher attempts without new authentication throw IllegalBlockSizeException.
An actual SDK success retired before worker handling rejects CANCELLED; direct
redelivery cannot commit and a new request still succeeds. Each native result
appears exactly once. Missing rejection signals, duplicate settlements and
changed generations would fail these controls.

TESTED: Process death immediately after real key generation leaves an occupied
alias without a record. Process absence, immutable key identity and duplicate
EXISTS are asserted. Cancel, destroy callback and retired real SDK success plus
stale delivery preserve that key. Explicit authenticated deletion permits a
different key and successful name reuse. The named controller timeout belongs
to this terminated host; it is not counted as a native result.

TESTED: Three counterfactual receipt mutations fail the verifier: removing the
fresh-cipher rejection, weakening the orphan timeout to 60 and duplicating a
retirement result. Restoring exact receipts passes. See verifier-negatives.json.

Limits: All runtime proof uses one API37 software emulator with securityLevel 0.
It establishes actual One integration on that host. It does not establish
hardware Keystore enforcement or an API30 device campaign. The destroy boundary
uses delivery of the production lifecycle callback from the proof receiver;
Home and process death are actual system transitions. Fault APK behavior remains
separate from the production APK. No stable release or One main change occurred.
Assigned first-layer p61184 and sole assembled p60786 review remain pending;
manager p61056 owns beta integration, CI and canary artifact verification.

Excluded attempts: The first locked attempt ran before deviceLocked became true
and cancelled on screen-off; it is not locked-device proof. A fabricated SDK
result failed construction and is not stale-success proof. A helper initially
treated the expected dead-process pidof exit as an error; the separate explicit
absence receipt establishes termination. Early build/source-selection failures
and premature lock/PIN UI assertions remain in raw receipts and are not counted
as passes. Later cases assert the relevant preconditions before native calls.
