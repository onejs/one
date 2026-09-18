# native-codegen status (One Native superset track)

## Now

M2 done, committing. Next: M3 generic emitters (generic leaf emitter +
generic enum-modifier emitter driven by inventory).

## Done

- MERGEREADY e17884bb4 (manifest coverage key + coverage script, one commit).
  Merge a95cd0206 landed with MAXIMUM_IOS=26; freeze over.
- M2 coverage dashboard done: `bun run coverage` prints per-module
  mapped/total views and modifiers (26/750 views, 50/467 modifiers at
  target SDK 26; 47 views + 52 modifiers above the ceiling counted
  separately), `--json` for machine use. Manifest carries the covered
  sets (collected at generate.ts selection sites); report filters the
  universe to the ceiling. Ceiling fallout fixed: TabRole.prominent@27
  dropped from bindings, README mentions removed. Gates: generate:check
  pass, tsc pass, coverage/inventory/menuItems tests pass (24/24).
- COMMITTED 460b29911 (generate.ts coverage sets) + 0f29c8ea8 (coverage.ts +
  coverage.test.ts). README has no uncommitted changes (M1 README work already
  in 5f87b5782). generate:check is expected-red until post-merge regen:
  manifest lacks the new coverage key. Frozen per coordinator mail: will not
  touch generate.ts, README, or regen output until merge confirmed. New
  constraint recorded: never bump MAXIMUM_IOS or commit post-26 symbols
  without a CI Xcode bump. Left uncommitted: 1-line coverage script in
  packages/native/package.json (file is mixed with ios-views regen lines).
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
- tests/containers.test.ts "implements a view for every registered
  component" fails on OneNativeListComponentView: ios-views registered
  List/ScrollView/Lazy components (dirty package.json) before the native
  views exist. Their WIP, not mine; my area's tests pass.
