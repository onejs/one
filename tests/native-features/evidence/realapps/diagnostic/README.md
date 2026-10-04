# Diagnostic real-app receipts

These are retained runtime probes, not the final same-artifact clean matrix.
Current status and artifact distinctions are in `plans/one-native-realapps.md`.

- RAN `contrast-ios-services.json`: CI64 clean published fcd4558352 binary,
  Air24 iPhone17Pro iOS27.0, same published JS family. Native notification
  permission, schedule, identifier and cancel completed. Physical haptics,
  microphone transcription and fetching an OTA were not tested.
- RAN `contrast-android-services.json`: earlier diagnostic binary with source
  overlays, published fcd4558352 JS. Updates reports disabled; this receipt
  does not validate the final configured runtime84 build.
- RAN `contrast-android-ui.json`: same diagnostic Android binary, published
  fcd4558352 JS. Page-one/page-zero callbacks, Portal touch and Image load
  passed. Blur/Mask/EdgeFade and geometry scopes are observations. Android
  Pager draft and composer/IME proofs belong to p56058/r54227.
- RAN `contrast-ios-primitives-negative.json`: clean fcd4558352 iOS binary
  and JS. Account-free Apple sign-in invokes the native provider and forwards
  AuthorizationError1000 after the system dialog's Close action. Credential
  sign-in is not tested. ArrangementView correctly rejects iOS27.0, requiring
  27.1; its rendering remains an open pool/runtime gap. Native leaves, Glass
  and tab callbacks carry their exact observed scopes.

UI artifacts and complete logs remain at the cited paths in the plan. No
receipt in this folder upgrades a diagnostic run into a final clean pass.
