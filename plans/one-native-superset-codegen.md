# native-codegen status (One Native superset track)

## Now

Milestone 1 done, committed. Next: Milestone 2 coverage dashboard (extend
codegen/measure.ts with a mapped-vs-unmapped per-module report).

## Done

- M1 floor at 17: audited every 26-only API use; all are gated with fallback.
  - native gates (pre-existing from the v2-beta floor merge, verified not
    re-broken): tabs legacy TabView below 18, tabBarMinimizeBehavior and
    glass button styles gated at 26, WebView Color.clear below 26,
    presentationSizing ignored below 18, glass falls back to material.
  - TS gates: adapters assert enum values against runtime Platform.Version;
    menuItems default iosVersion is the floor (17).
  - regen: manifest sdk stamp 27.0 -> 27.1 (local SDK; only diff, no binding
    change). generate:check, iOS 17 swiftc typecheck, VerifyControlled pass.
  - README floor claims corrected (17+ build; per-feature 18/26 notes).
  - tests/native-features app.json deploymentTarget 26.0 -> 17.0.
  - gates: generate:check pass, tsc pass, vitest 40/40 pass.

## NEEDS-BUILD

- 5f87b5782 (M1 floor fixes): app.json deploymentTarget 26.0 -> 17.0 wants a
  coordinator xcodebuild + conformance run.

## Blocked

- Stale comment in ios-views territory, not edited per ownership:
  packages/native/codegen/mediaCatalog.ts:185 still says WebView "is the
  package floor, so it needs no availability gate". The code below it does
  gate. Needs a comment fix by native-ios-views.
- Possible stale docs claim (out of scope, flagging only):
  apps/onestack.dev/data/blog/version-two.mdx:148 says apps using
  @vxrn/native "build for iOS 26". Coordinator call whether to touch a
  release-history post.
