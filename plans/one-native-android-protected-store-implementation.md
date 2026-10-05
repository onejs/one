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
