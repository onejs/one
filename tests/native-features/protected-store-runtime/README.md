# ProtectedStore native host proof

This host imports the actual native wrapper and exercises the generated Nitro
bridge in the prebuilt NativeFeatureTests Android application. Its WebSocket
controller runs each command through the four existing ProtectedStore methods.
The control receiver belongs only to the generated proof host. It inspects key
metadata and delivers stale callbacks after owner destruction through reflection;
production has no test receiver or debug controls.

Prebuild with Node, run `python3 protected-store-runtime/prepare-host.py`, then
use the normal shared heavy window for the actual One Kotlin/C++ target and
arm64 host APK. Build with `-PreactNativeDevServerPort=8131`. The preparation
script uses the normal RN host and declares USE_BIOMETRIC plus the proof receiver
in the generated application. Start Metro with
this directory's config and start `controller.ts`. Reverse 8131 and 8132 only
on the claimed emulator. POST JSON commands to localhost:8132/command; each
response is the actual native resolution or rejection. Record retained key and
record identities alongside results. System authentication must be supplied on
the emulator for each existing-item call.

A result timeout fails the call. Cancellation and missing-result controls do not
become passes. Hardware enforcement remains outside this software API37 proof.
