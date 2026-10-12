# ProtectedStore public entry correction

RAN: With the unchanged Android unavailable entry, the proof importing
`{ One } from 'one'` rejected create with the existing missing-build message on
API37. The baseline result is retained. After deleting that entry and its
stale generated declaration, the same package entry creates, authenticates a
read of the exact value, authenticates deletion and then reads null. This is
five observed native results including the before-fix rejection. The harness
calls One.ProtectedStore through the published package export; it no longer
imports ProtectedStore's private native file.

TESTED: Actual changed manifest host APK build passed in 35 seconds. One's
package JavaScript build, package TypeScript and harness TypeScript passed. The app manifest does not
name USE_BIOMETRIC, the merger report attributes it to One's library manifest,
and the installed package reports it granted. Its installed APK pullback
matches SHA256 6e7f544dbc2649e2938753ef25b787151db7d1a79837dcee2b46143114ed3523.
APK and bundle masters are preserved under /Users/n8/.team-machine/handoffs.
identity.json pins their hashes and changed source identities. A failure to
reach the native implementation, retrieve the exact value, delete the key,
merge the permission or match the installed APK would fail the controls.

READ: API levels below 30 retain the unchanged Kotlin validate() guard with
`ProtectedStore.<method> needs an iOS or Android build`. The JavaScript guard
that supplied a different message is removed. The production Kotlin hash and
libOne.so hash match the original producer; no native store semantics or
fault hooks changed. The generated type descriptor now mirrors Android's
existing Kotlin binding.

The original 92 checks over 64 results remain intact under ../evidence.
This correction adds only the required public-entry round-trip and manifest
merge proof. Runtime remains one API37 software emulator. No lower-API or
hardware campaign, security matrix or additional reviewer was added.
The app was first installed before credential storage unlocked and could not
launch; installing after explicit unlock made it launch. A command attempted
before WebSocket readiness returned 409 and is not counted as a native result.
The unlocked and ready preconditions are retained for the corrected calls.
Assigned final p60786 disposition and manager p61056 beta integration/CI remain.
