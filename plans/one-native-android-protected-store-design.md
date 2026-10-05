# Android ProtectedStore supported design

TESTED: API 37 supports a route that preserves no-prompt creation and fresh
authentication for later calls: encrypt a per-value AES-GCM data key with an
unrestricted RSA public key, then bind every read/update to an auth-per-use RSA
private decrypt operation. Fresh policy authentication permits deletion even
after that private key is permanently invalidated. This is a supported SDK
proposal for the assigned review; One native implementation remains HELD.

## scope and source (2026-10-05 UTC)

Assignment: “Native implementation remains HELD.” Only existing
`One.ProtectedStore`, original task `t-muusi2v1-1hh50`, child task
`t-muuuyexe-nw80`, branch `tm/protected-store-design`, owner `r59432`.
One production Kotlin, Nitrogen, specs, public APIs and native configuration
were not changed. CI/integration owner: p61056. Assigned review: p61184 public
first layer, then p60786 substantive design gate. No helpers or new reviewers.

RAN: fetched v2-beta and created the managed draft worktree from
`cb95b1e2ec7bd77c0b32f177df05ecda618aaef9`. Read pinned public contract at
`1fb90038c9005b28229947627672bfa42ba0f443`: Nitro spec, Swift implementation,
native wrapper, Android guard and protected-store doc. Read the owning launch
plan and frozen One-only `system-approval.md` on pro-128. The boundary forbids
authentication windows, plaintext persistence, silent rekey/data loss and
weaker policies. No private source/evidence was inspected.

RAN: creation has no reason; Swift `SecItemAdd` does not evaluate authentication.
Get/update/delete carry a reason and use fresh `LAContext` policy authentication.
Missing get returns null, missing update rejects, and missing delete succeeds.
The public doc permits explicitly deleting an invalidated item to reuse its
name. Source hashes are in `evidence/producer.json`.

RAN: searched existing public Android storage first. `HybridOneSecureStore.kt`
has a shared unrestricted AES key and automatic rekey. That lifecycle cannot
serve this contract. `OneShareDraftStore.kt` already uses Android `AtomicFile`;
reuse that platform primitive and the existing `OneNativeError` convention
when implementation is approved. No new general storage abstraction is proposed.

## exact SDK route

The probe uses platform APIs only, with API 30 as the declaration floor. Actual
runtime evidence is API 37. Its key recipe is:

```java
new KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_DECRYPT)
  .setKeySize(2048)
  .setDigests(KeyProperties.DIGEST_SHA256)
  .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_RSA_OAEP)
  .setUserAuthenticationRequired(true)
  .setUserAuthenticationParameters(0, authenticationTypes)
  .setInvalidatedByBiometricEnrollment(currentSet)
  .setUnlockedDeviceRequired(true)
```

Use `AUTH_BIOMETRIC_STRONG` alone for `biometryCurrentSet`, and
`AUTH_BIOMETRIC_STRONG | AUTH_DEVICE_CREDENTIAL` for `userPresence`. Match the
framework prompt authenticator mask exactly. Do not use weak biometrics,
a positive timeout, `setUserAuthenticationValidWhileOnBody`, or an app success
cache. The word `userPresence` in One denotes biometric/passcode authentication,
not Android's separate `setUserPresenceRequired` hardware-presence primitive.

RAN: both public encryption and private decryption used
`RSA/ECB/OAEPWithSHA-256AndMGF1Padding` with explicit
`OAEPParameterSpec("SHA-256", "MGF1", MGF1ParameterSpec.SHA1, DEFAULT)`.
Reconstruct the public key through `KeyFactory` from its X.509 bytes and use the
ordinary public-key JCA encryption provider. Private operations use the original
AndroidKeyStore private key. Public encryption wraps only a random 32-byte AES
key. AES-256-GCM encrypts the UTF-8 value with a fresh IV and authenticates item
identity and policy as AAD. Persist only policy/identity, IV, wrapped data key
and authenticated ciphertext in `noBackupFilesDir`. Clear temporary data-key
arrays in `finally`; never cache them across calls.

Sources: [private/public authorization](https://developer.android.com/reference/android/security/keystore/KeyGenParameterSpec),
[key authentication/enrollment parameters](https://developer.android.com/reference/android/security/keystore/KeyGenParameterSpec.Builder),
[per-use CryptoObject](https://developer.android.com/reference/android/hardware/biometrics/BiometricPrompt.CryptoObject),
[authenticator selection](https://developer.android.com/reference/android/hardware/biometrics/BiometricPrompt.Builder).
API signatures, runtime successes and discriminating failures are separate
receipts; signatures alone did not establish feasibility.

## call and lifetime protocol for implementation review

INFERRED proposal from the tested primitives:

| existing call | exact operation ownership |
| --- | --- |
| createItem | Validate inputs, installed biometric permission, unlocked device and policy capability. Reject any existing record or alias. Generate one immutable per-item RSA key pair; public-wrap a fresh data key and durably commit the encrypted record. Never construct an authentication prompt. |
| getItem | Validate reason; return null only for an absent item. Verify requested/stored policy against immutable key metadata. Initialize a fresh private RSA decrypt cipher, pass that exact cipher in CryptoObject to a fresh prompt using the reason, then unwrap and authenticate/decrypt the record. Return the value only from that operation. |
| updateItem | Reject absence/policy mismatch. Authenticate and decrypt the prior envelope through a fresh private operation. Public-wrap a new data key for the new value, retaining the original RSA alias/policy. Commit the replacement atomically only while the request still owns the same record generation. |
| deleteItem | Resolve absence without a prompt. For an existing item, verify immutable policy and obtain a fresh non-crypto prompt for that policy using the reason. Delete the encrypted record and its alias only from the live success callback. Do not decrypt the old value, which permits removing an invalidated record. |

TESTED: `KeyInfo` remains readable after biometric invalidation. Authenticate
using policy checked against `isUserAuthenticationRequired`, timeout zero,
authentication type and enrollment-invalidation flag, rather than trusting a
mutable JSON label. Changing a current-set record label to user-presence failed
before deletion. Record AAD separately detects value/identity/policy corruption.

INFERRED lifetime requirement: one native owner serializes item mutations and
foreground prompt requests. Each request owns its activity, cancellation signal,
cipher, item generation and exactly-once terminal state. On cancellation or
owner destruction, retire that request and release its crypto state. A success
callback checks ownership and record generation before any mutation. A prior
success cannot authorize another operation. A credential sheet's own UI must
not be mistaken for loss of the owning foreground authentication request.

INFERRED durability requirement: keep prior ciphertext until `AtomicFile` commit
succeeds; do not delete/regenerate the RSA alias on read/update/authentication
failure. Reject duplicated creates after invalidation. A synchronous creation
failure can discard only its newly created, uncommitted alias. A process death
between key generation and record commit can leave an alias without a ready
record; retain it and reject replacement until explicit, freshly authenticated
deletion using its immutable key policy. Deletion must consider aliases as well
as records, so that such an incomplete creation can be removed without a value.
Do not treat a lost alias, corrupt record, or invalidated key as authority to
create a replacement key. One integration must prove these crash boundaries;
the probe proves process death during update, not every storage fault boundary.

INFERRED error mapping: preserve existing input/policy/exists/not-found codes.
Missing declared `USE_BIOMETRIC` maps to manifest failure before creation;
capability/unlock/permanent invalidation maps to authentication failure. User,
app and system cancellation reject once with the existing cancellation code.
Other cipher/storage errors use the existing get/write errors. No new public
signature, configuration option or error family is needed. API levels without
the required credential/per-use route retain the existing unavailable guard;
this proposal does not add an authentication-window alternative.

## runtime proof and falsifiers

TESTED: 41 executable assertions against 104 retained main-probe events and the
separate missing-permission producer. `probe/verify-evidence.py` verifies the
actual receipts. Key observations:

- Creation succeeded with no prompt for both policies; zero timeout, auth masks,
  enrollment flag, unlocked requirement and non-exportable private key were read
  back through `KeyInfo`.
- A symmetric authenticated AES creation control failed with Keystore
  `KEY_USER_NOT_AUTHENTICATED`; the public-key envelope succeeded independently.
- PIN and fingerprint CryptoObject prompts recovered known value hashes.
  Consumed-cipher reuse and a newly initialized cipher both explicitly failed
  without another authentication, including immediately after a success.
- Canceled reads/updates/deletes left record hashes unchanged. A successful
  biometric update was read with a fresh prompt; a PIN update was read through
  the newly enrolled fingerprint. Home canceled a pending update. Force-stop
  during update retained ciphertext, policy and public-key identity on restart.
- Enrollment was positively observed changing from one fingerprint to two.
  The old current-set key threw `KeyPermanentlyInvalidatedException` on get and
  update while record/public-key hashes remained identical. Duplicate create
  rejected. Canceled delete retained the record; a new fingerprint prompt then
  removed it. Only after explicit deletion did creation produce a new identity.
- Changed policy metadata could not weaken deletion; changed ciphertext produced
  `AEADBadTagException` after authentication and remained in place. The second
  APK, with only `USE_BIOMETRIC` omitted, produced an explicit `SecurityException`.
  Locked creation left no alias or record. Missing-item controls retained their
  three distinct outcomes.
- A 9,216-byte UTF-8 value containing Unicode and newlines was recovered by exact
  digest, proving the value is not limited to RSA's direct-message capacity.

Falsifiers remain concrete: an unauthenticated private success, reuse after a
prior success, an invalidated key recovering data, policy weakening through
metadata, or a canceled/lost-owner request mutating bytes would reject this
route. The retained positive and negative controls discriminate those outcomes.

RAN: one enrollment attempt sent touches before the UI reached its final stage;
it was excluded from invalidation claims. The successful attempt retained the
`Fingerprint added` checkpoint and count-two sensor receipt. An initial large
value passed through unquoted adb shell arguments failed as a transport probe;
`control.py` now quotes shell arguments, and `longvalue2` is the successful
producer. These failed attempts are retained, rather than reported as passes.

## identity, cost and remaining gate

RAN: producer identities include every pinned contract hash, probe source
versions, API37 android.jar, system-image package descriptor, framework build
fingerprint, APK SHA-256, actual installed package path and pull-back byte match.
`evidence/producer-final.json` identifies the final two installed APKs. Archived
v1/v2 Java files explain earlier receipt producer boundaries. No Gradle/One
native builder or another lane's corpus was used.

RAN: this emulator reports `securityLevel=0`. Evidence establishes SDK operation
ownership on a software emulator, not physical secure-hardware enforcement,
physical-device timing, or One/Nitro integration. Those claims are not made.
The Android host/config/error mapping, crash fault injection and actual One API
runtime suite stay with the original author after assigned design approval.

INFERRED cost: one RSA alias per item and one RSA private unwrap for each
read/update; deletion requires a prompt but no unwrap. The binary envelope adds
256 bytes of wrapped key, a 12-byte IV and a 16-byte tag before record metadata
and encoding. One asymmetric operation wraps each new value. The probe observed
individual creation calls of about 23–69 ms on this emulator; these are receipts,
not a comparative performance benchmark. No app runtime code is added by this
branch.

Disposition requested from the existing reviewers: approve or reject this
supported per-item envelope/deletion protocol within the existing contract.
Native implementation remains HELD until p61184 then p60786 disposition, routed
by p61056. This worker does not take implementation ownership or v2-beta landing.
