---
id: t-mv70oame-1bm20
title: Pair review One native closeout PRs 827 834 835
status: done
assignees:
- r90711
labels:
- one-native
- review
backend: git
created_at: 1791916259270
updated_at: 1791917178422
field_marks:
  active_form: 1791916259270
  body: 1791917178422
  claim: 1791916259270
  evidence_summary: 1791916259270
  owner_status: 1791916259270
  parent: 1791916259270
  priority: 1791916259270
  recovery_ref: 1791916259270
  status: 1791917178356
  title: 1791916259270
---
Pair verdicts (r90711), against main 903b49322:

PR834 530bf8e28: APPROVE. RAN: iphoneos arm64 -wmo link probe of the PayLater bodies plus a second strong PassKit file: 10/10 PayLater refs strong before, weak after, _PassKit_SwiftUI LC_LOAD_WEAK_DYLIB. RAN: MacOSX27.0 iOSSupport _PassKit_SwiftUI.tbd has 0 PayLater symbols (iOS tbd has them), so the premise holds. RAN: generate --check verified output equals commit. Limits: no archive, Mac launch or ASC upload; using either modifier on Mac traps by design.

PR835 aae657518: APPROVE on code, native assertion UNPROVEN. RAN: generate --check verified. INFERRED: RN RCTViewComponentView writes testID to accessibilityElement (=_nativeView) when changed, generated cleanup runs after super every update, so only the SwiftUI element keeps the id; decorative fallback moves to the same receiver RN used. Handwritten Button (no override) and Camera (no SwiftUI id) are not affected. Proof limit: PR checks have no iOS native suite, and my local sim build succeeded but every input driver (axe, idb, Appium typing/deeplink) failed to reach this host's simulator, so the new uniqueness assertion has not run anywhere. It runs in iOS Native Tests on push to main.

PR827 bb8a35a9e: APPROVE code, conditional on your hosted zoom run. RAN: delta 72ac..bb8a is only zoomDebuggerDiagnostics.test.ts, 4/4 pass locally. TESTED: attachZoomDebugger against a real debuggable process: attach 0.3-0.6s, target keeps running attached and after detach. RAN: animator message prefixes match Animators.native.tsx. Notes, non-blocking: the PID assert passes even when attach fails (the ^error: check catches it); OneDerivedStoreViewsUITests is added only by prepare-ios-purchases.rb, which no CI job calls, so Product/Store/SubscriptionStoreView catalog proof is manual only.

No repairs authored. Task t-mv70oame-1bm20.
