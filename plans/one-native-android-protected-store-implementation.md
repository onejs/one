# Android ProtectedStore implementation

## authorized scope, 2026-10-05 UTC

The implementation brief says: “Implement only ProtectedStore native parity” and “document locked existing get/update/delete reject E_PROTECTED_STORE_AUTH without prompt/bytes/key mutation.” The frozen p60786 verdict approves the per-item RSA public envelope and zero-timeout private CryptoObject unwrap. Existing signatures, policies, configuration and errors remain the contract. Manager p61056 owns beta integration and CI. p61184 is the assigned public first layer; p60786 is the sole assembled substantive gate.

## rules recorded before source edits

- Validate input, reason and declared USE_BIOMETRIC before item work. API levels below the required API 30 route retain the unavailable guard.
- Missing means both record and Keystore alias absent. Only that state permits get null, update NOT_FOUND, and delete success without a prompt.
- Existing get/update/delete while isDeviceLocked reject E_PROTECTED_STORE_AUTH before a prompt and leave bytes and key unchanged. Creation also requires an unlocked device.
- An orphan alias from death after key generation remains occupied. Verify its immutable KeyInfo against the requested policy, obtain fresh matching-policy authentication, verify the live exactly-once request and item generation, then deleteEntry. Cancellation, owner destruction and stale success leave it untouched. Explicit deletion permits name reuse.
- Read/update use one fresh private RSA cipher per prompt, require the identical cipher returned by CryptoObject, authenticate the prior AES-GCM envelope, and never cache authentication or data keys.
- Serialize foreground prompts and mutations under one process owner. AtomicFile preserves prior ciphertext on failed replacement; callbacks cannot commit after retirement or generation change. Deletion also permits an invalidated key without decrypting it.

## proof obligations

Actual One/Nitro host: both policies, creation without prompt, fresh reads/updates/deletes, long UTF-8, missing and duplicate semantics, immutable-policy tamper, ciphertext tamper, enrollment invalidation and explicit reuse. Bounded injected controls cover pre-record keygen death, cancel/destroy/stale callbacks, same-cipher identity, failure before atomic commit and generation ownership. SDK API37 software evidence remains distinct from actual One integration and hardware claims.

## candidate disposition, 2026-10-05 UTC

TESTED: Production source commit 94d765a567e56b6c813e6d3dc977603792fe6c07
compiled in the actual One/Nitro arm64 host. The committed runtime evidence
passes 92 checks over 64 native results, including the required bounded
negative controls. The host, fault variant and permission-omitted APK have
separate identities. See
proof and limits (local run output, not committed).
Package and harness TypeScript checks passed. Production source has no test
receiver or fault switches. First-layer p61184 and assembled p60786 gates remain
assigned; manager p61056 owns beta integration and delivery CI. No main or stable
release authorization is implied.

Cost: Each item adds one 2048-bit RSA alias and one encrypted envelope. Each
write generates a fresh AES256 key; existing reads/updates perform one
private unwrap under a fresh prompt. Deletion prompts without decrypting an
invalidated envelope. Values add a 256-byte wrapped key, 12-byte IV and 16-byte
GCM tag plus metadata. The process owner serializes requests on one worker;
there is no cached authentication or data key. Emulator timings include prompt
automation and provide no hardware performance comparison.

## public entry acceptance correction, 2026-10-05 UTC

The assigned first layer found that Android selected the unavailable file while
the proof imported index.native directly. Manager p61056 assigned: “delete
Android unavailable entry per full-availability Browser pattern and prove
existing package-public entry create/get/delete round-trip.” Remove the stale
entry, retain Kotlin ownership of the API30 floor and existing per-call missing
build message, and declare the normal USE_BIOMETRIC permission in One's library
manifest. Document its merger behavior and explicit removal error. Preserve the
existing 92/64 native controls. Validation is limited to the public entry round
trip, the changed JavaScript output and manifest merge; no additional security
matrix or native source change. Manager owns CI; p60786 is the sole final gate.

TESTED: The package-public failure was reproduced before removing the stale
entry. The corrected public create/get/delete/missing-get round-trip passed,
and the app inherited the granted biometric permission from the library
manifest. One JavaScript build, TypeScript and changed manifest host build pass.
The production Kotlin and libOne.so hashes match the original producer.
[Correction receipts](../tests/native-features/protected-store-runtime/public-entry-evidence/README.md)
retain the before/after outcomes and separate them from the 92/64 native proof.
