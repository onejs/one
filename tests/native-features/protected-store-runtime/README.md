# ProtectedStore native host proof

This host imports the actual native wrapper and exercises the generated Nitro
bridge in the prebuilt NativeFeatureTests Android application. Its WebSocket
controller runs commands through the four existing ProtectedStore methods.
Production has no receiver or fault controls. The generated proof application
contains a receiver for immutable key inspection and lifecycle callback delivery.

Prebuild with Node, run `python3 protected-store-runtime/prepare-host.py`, then
use the normal shared heavy window for the actual One Kotlin/C++ target and
arm64 host APK. Build with `-PreactNativeDevServerPort=8131`. The preparation
script uses the normal RN host and declares USE_BIOMETRIC plus the proof receiver
in the generated application. Start Metro with this directory's config and
start `controller.ts`. Reverse 8131 and 8132 only on the claimed emulator.
POST JSON commands to localhost:8132/command; responses are native results.
`run.py` supplies semantic prompt assertions, synthetic authentication and the
prepare, positive, cancel, long and individual-call phases. Retained command
receipts include the additional bounded cases and their assertions.

For the separate bounded fault APK, run `inject-faults.py`. It copies the
production source into the ignored generated host, injects the four named
boundaries and writes `android/protected-store-faults.gradle`. Pass that file
with Gradle `--init-script`; the script selects the copied source for One's
Kotlin task while preserving generated Java bridge inputs. Do not use this init
script for the production APK. Fault markers in the application's cache select
keygen death, pre-commit failure and retirement before handling SDK success.
Actual SDK success is captured before retirement, then the receiver can deliver
that same result again. A fabricated AuthenticationResult is not proof of this
boundary. Cipher controls throw if a consumed or fresh private operation can
reuse authentication. KeyInfo's unlocked-device getter is used only by the
API37 proof receiver; production sets the constraint at generation and does
not call the newer getter.

Run `python3 protected-store-runtime/verify.py` to verify the committed receipts.
[evidence/README.md](evidence/README.md) records producer identities, observations,
excluded attempts and limits. A result timeout fails the call, except the named
process-death case whose process absence and orphan key are separately asserted.
Hardware enforcement remains outside this software API37 proof.
