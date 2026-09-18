# native-codegen status (One Native superset track)

## Now

Spec-template numeric imports done, committing. Emitter wiring waits on the
ios-views leaf-adoption commit, then I wire emitControls to deriveLeafSwift.

## Done

- MERGEREADY e17884bb4 (manifest coverage key + coverage script, one commit).
  Merge a95cd0206 landed with MAXIMUM_IOS=26; freeze over.
- M3 V1 generic emitters done: codegen/derive.ts (deriveLeafSwift from SDK
  signature + LeafArg descriptors; unconsumed enum fields auto-chain as
  modifiers) and selectEnumModifier in inventory.ts (style enums via generic
  constraint, value enums via single `_:` parameter, nested types via
  flattened name; throws on ambiguity/absence). Proof: tests/derive.test.ts
  (13 tests) shows derivation reproduces the hand-written bodies of Text,
  Label, Gauge, Toggle, Stepper byte for byte; a local real-SDK probe
  confirmed the same plus 21/21 unambiguous enum resolutions (Visibility is
  genuinely 13-way ambiguous; roles/Axis/Edge/Photos enums are ctor args,
  not modifiers). No regen output changed: generate:check verified,
  tsc + vitest 84/84 pass.
- Spec template numeric imports: the generate.ts components-loop spec template
  now imports Double/Float from CodegenTypes when a recipe's props or events
  use them (Lazy-stack spacing); existing specs render byte-identical.
  generate:check verified no-op, tsc + vitest 84/84 pass. End-to-end positive
  case lands with the ios-views spacing-prop regen.
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

## Catalog proposal (needs coordinator sequencing; not editable by me)

1. Add `leaf: LeafRecipe` to the five proven recipes (Text, Label, Gauge,
   Toggle, Stepper). The exact descriptors are the `leafArgs` fixtures in
   tests/derive.test.ts; controlTypes.ts already carries the optional field.
2. Ambiguous-enum override for migration wave 2: extend the derivation input
   with `{ field, enum, modifier }` so Visibility-typed fields (sheet drag
   indicator, web content background, list row visibility) name their
   modifier explicitly instead of resolving. I will add the override to
   derive.ts when the first recipe needs it.
3. V2 descriptor gaps (my follow-ups, in order): conditional constructors
   (ProgressView, Image, Slider), bool-field modifiers + action modifiers
   (TextField/SecureField chain), converted bindings (DatePicker epoch ms,
   ColorPicker hex). Presentation hosts, Map, Video, Photos, WebView, Share,
   dialogs, Button disclosure stay hand-written: custom surfaces and
   branching no descriptor set earns yet.
4. Emitter wiring (mine, after recipe adoption): emitControls takes the
   inventory and uses deriveLeafSwift when `control.leaf` is present, keeping
   `swift` as a byte-equality oracle during transition; delete hand-written
   bodies only after generate:check stays green.

## Blocked

- Stale comment in ios-views territory, not edited per ownership:
  packages/native/codegen/mediaCatalog.ts:185 still says WebView "is the
  package floor, so it needs no availability gate". The code below it does
  gate. Needs a comment fix by native-ios-views.
- (dropped per coordinator: release-history posts are not touched.)
- (resolved) the containers.test.ts OneNativeListComponentView failure cleared
  when ios-views landed the native views; suite is 84/84 green.
