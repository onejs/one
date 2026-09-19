# native-codegen status (One Native superset track)

## Now

Merge-gate items done, committing. Behavioral bundle probe green; string
tests removed; Windows fix in. Dist-export restore still waits on
coordinator device validation. Closed-world stays behind the CI-owner gate.

## Design: static view-config emission (implementation on coordinator go)

### Goal

The published package must not depend on any bundler running
@react-native/babel-plugin-codegen. Our own build emits static view configs
byte-identical to the plugin's output; babel stays a fallback that never
triggers for our files. src/specs stays raw (pod-install codegen reads it);
the react-native->src export resolution stays until the coordinator
device-validates the new dist output; the revert to dist is a separate
sequenced step (not this milestone).

### RAN findings (study)

- The plugin (260-line wrapper) detects `export default
  codegenNativeComponent<...>(...)`, runs @react-native/codegen's
  TypeScriptParser.parseString + RNCodegen.generateViewConfig over the whole
  file, and splices the re-parsed view-config block over the default export
  (plus removing a `Commands` export). Our Menu spec produces the expected
  `__INTERNAL_VIEW_CONFIG` + `NativeComponentRegistry.get` tail.
- Dist failure mode, reproduced: the plugin on
  `dist/esm/specs/OneNativeMenuNativeComponent.mjs` is a silent no-op (the
  compiled `export { X as default }` has no call to match), so dist ships a
  bare `codegenNativeComponent("X")` with no view config. Serving src is the
  current workaround (exports map react-native->src).
- Our specs use no `codegenNativeCommands` (grep, 0 hits); several specs use
  `{ interfaceOnly: true }` (Tab, Label, Popover, Image, ...). Parity
  fixtures must cover interfaceOnly; Commands needs only a synthetic fixture.
- @vxrn/compiler verdict (asked): `transformReactNativeCodegen`
  (oxc-based, babel-free) transforms all 53/53 src specs with 0 skips and
  0 throws, so the rolldown path handles our src specs today. But it also
  requires the type argument (no propsTypeName -> returns null, file left
  alone), so dist needs the same static treatment. After that, both the
  babel plugin and the vxrn transform skip static files safely (neither
  matches without a remaining `codegenNativeComponent` call), and the Metro
  worker path (metroNativeWorker.ts, same transform) is covered too. No
  compiler changes needed.
- Plugin-output bytes still contain TS types (Metro strips downstream), so
  dist statics need a strip stage; tamagui-build emits per-file esm/cjs
  mirrors (adapters import specs relatively, so mirrors resolve).
- `files` publishes `src`, confirming the src-stays-raw constraint.

### Approach

New pure module `codegen/emitViewConfig.ts`: replicate the plugin's splice
with the same underlying calls (parse spec with @babel/parser TS,
TypeScriptParser.parseString + RNCodegen.generateViewConfig with the same
libraryName rule, re-parse the view-config string, replace the default
export, remap locs to it, remove Commands, print with @babel/generator
defaults). Same parser + generator + printer as the plugin; only the splice
is ours, which is exactly what the parity test pins.

New build step `codegen/staticSpecs.ts`, wired as
`tamagui-build && bun codegen/staticSpecs.ts` (build scripts are mine to
touch; exports map untouched): for each src/specs/*.ts, emit plugin bytes,
then strip + format per dist mirror with esbuild (.mjs ESM, .cjs CJS, all
spec-derived mirrors by stem glob incl. .native.js variants) and regenerate
sourcemaps (never leave stale maps). Fail loud if a src spec has no dist
mirror. generate.ts is NOT extended: it emits committed sources, while
statics are gitignored build artifacts with a different lifecycle.

Rejected: running the babel plugin itself in our build (makes the parity
test vacuous); reimplementing view-config semantics from recipes (duplicates
upstream RNCodegen logic, brittle across upgrades); teaching tamagui-build a
staging input (needs unknown cooperation; post-rewrite needs none).

### Work plan

Unit 1: `emitViewConfig.ts` + `tests/viewConfig.test.ts`: byte-parity of our
emitter vs the real plugin (pinned babel options) over ALL src/specs
(self-updating, covers interfaceOnly/events/objects/Double/Float) plus a
synthetic Commands fixture. No pipeline changes.

Unit 2: `staticSpecs.ts` + build-script wiring + devDeps (@babel/core,
@react-native/codegen pinned with peer RN major) + never-triggers assertion
(emitted output contains no codegen call) + README packaging paragraph.
Validate by building and asserting dist specs carry view configs, strip
cleanly, and map correctly. Device validation stays the coordinator's;
revert-to-dist stays a separate step.

### Risks

- @react-native/codegen version skew: our statics pin our devDep version
  while pod-install codegen uses the app's RN version. The view-config wire
  format is stable across recent versions; pin the devDep major in line with
  peer react-native. Flagged, not blocking.
- tamagui-build layout drift (new mirrors/renames): the step globs by stem
  and fails loud on unmapped specs instead of silently skipping.
- @babel/* printer upgrades change bytes: both parity sides share the
  installed printer, so parity holds; device behavior depends on semantics,
  which are stable.

### Open questions

1. What consumes the dist `.native.js` spec mirrors, and must the static
   step cover them identically (design assumes yes via stem glob)?
2. Confirm the @react-native/codegen devDep pin policy vs peer RN (skew
   risk above); who owns the bump cadence?
3. Confirm sequencing: implementation starts on your go, device validation
   of new dist output stays yours, revert-to-dist after that.

## Design: closed-world generation (pending CI-lane review)

### Goal

Cross-SDK deterministic generation: `generate:check` green with byte-identical
output on SDK 26.4 (CI) and SDK 27.1+ (local), so an SDK removal or addition on
one SDK can never red another SDK's check again.

### Success criteria

- `generate:check` green on 26.4 and 27.1 with identical output.
- Regen with no catalog change is a no-op on both SDKs.
- ListStyle keeps its 6 cases; roundedBorder stays out (removal by design,
  documented below).
- Any future SDK-side addition, removal, or signature change surfaces as a
  loud contract error naming the declaration, never as silent output drift.

### Context and current facts

- CI run 35407302490: `generate:check` red on SDK 26.4, green on local 27.1.
- RAN `git diff origin/v2-beta HEAD -- codegen/swiftui-manifest.json`: the only
  SDK-caused change is `- "roundedBorder": 13`. v2-beta has
  TextFieldStyle=[automatic, plain, roundedBorder]@13; HEAD has
  [automatic, plain] with ListStyle at 6 cases.
- RAN grep: zero `roundedBorder` occurrences in packages/native; HEAD is a
  consistent SDK 27.1 state, which is exactly why 26.4 (which still ships the
  case) regenerates a different manifest.
- MAXIMUM_IOS=26 filters by iOS version only (symbols above 26); it cannot see
  removals, so it cannot fix this class of drift.
- Manifest readers today: generate.ts (writes it) and coverage.ts (reads `.sdk`
  as the ceiling and `.coverage` only). Nothing else consumes it.
- Emission sites consuming SDK-derived VALUES: the enum scan (cases + iOS
  versions into swiftui.ts, OneNativeSwiftUI.swift, schema enums) and the
  catalog-method selection (iOS gate + params + requirements into modifier
  helpers). Constructor and recipe-method selections otherwise feed only the
  manifest's own `constructors` block and the mapped-symbols log count
  (generate.ts ~566, ~642).

### Constraints and non-goals

- Keep the `SDK >= MAXIMUM_IOS` guard.
- My ownership only: generate.ts, inventory.ts, new codegen modules, tests,
  status. No catalog, ios/, android/, or src/*.native.tsx changes.
- Emitter wiring stays queued behind this milestone.
- coverage.ts needs no changes (`.sdk` stays the ceiling, `.coverage` is
  carried forward). Accepted limitation, not fixed here: dashboard TOTALS
  derive from the local inventory so they stay SDK-local; the MAPPED counts
  (the hill-climb numbers) are contract-stable.
- No timestamps or toolchain fingerprints in the manifest (determinism).

### Key decisions

1. The checked-in manifest is the contract. Normal `generate` / `--check`
   derives every SDK-sourced output value from (manifest + catalog) only.
2. Assert, never silently carry: each contracted declaration must resolve in
   the local inventory; a miss is a hard error naming the declaration. Reason:
   emitting a locally-absent symbol (e.g. `.roundedBorder` on SDK 27)
   produces Swift that fails swiftc with a confusing error; the assertion
   converts that into a clear contract error.
3. New catalog selectors not in the contract are hard errors directing to
   refresh, not silent open-world fallbacks (a fallback would reintroduce
   drift through the side door).
4. Stale contract entries (catalog removed something) are carried forward
   verbatim in normal mode and pruned only by refresh, so no-op regen stays
   green and deletions show up reviewably in the refresh diff.
5. Normal-mode inventory is restricted to contracted modules: extra local
   overlay modules are never parsed, so they can neither leak in nor cause
   ambiguity. A contracted module missing locally is a hard error.
6. Refresh mode is `--refresh-contract` (script `generate:refresh-contract`):
   exactly today's open-world behavior (full local inventory, recompute
   everything including modules/unmapped/coverage) plus writing `refreshedOn`
   (local SDK version, audit trail only). The manifest diff gets human review;
   CI validates it on the ceiling toolchain.
7. Refresh runs on the NEWEST supported SDK (documented rule). Removals drop
   from the contract by design; ceiling CI then proves backward containment.
   Escape hatch: if a refresh reds ceiling CI (a back-available newest-only
   declaration), a human prunes that entry in a reviewed commit.
8. `manifest.sdk` stays the ceiling (`"26"`); `refreshedOn` is additive.
   Old manifests without it keep working (it is informational only).
9. New import-safe module `codegen/contract.ts` holds the lookup/assertion
   logic with unit tests; generate.ts stays a thin script (it is not
   import-safe, so its logic cannot be unit-tested in place).
10. Lookup keys: enums by type then case; methods by name + stable signature
    JSON (params + requirements); constructors by type + stable params JSON.
    Keys exclude the module, so a declaration moving between two contracted
    modules still resolves instead of erroring.

Rejected alternatives:

- Ghost entries (emit contracted-but-locally-absent symbols without
  asserting): produces uncompilable Swift on the newer SDK and violates the
  assert directive.
- Excluding the manifest from `--check` (old foundation-review opinion):
  destroys contract enforcement; the manifest diff is the review surface.
- Multi-SDK intersection refresh: needs several toolchains for what
  refresh-on-newest plus ceiling validation already proves.
- Per-SDK conditional contracts: machinery for a theoretical case; module
  moves inside the contracted set already resolve (decision 10).

### Recommended approach

Normal mode becomes a pure function of (contract, catalog):

1. Load `codegen/swiftui-manifest.json`; missing file is a hard error
   directing to refresh. Keep the `SDK >= MAXIMUM_IOS` guard.
2. Parse only contracted modules (readInventory allowlist); a contracted
   module absent locally is a hard error.
3. Flip the enum loop: iterate CONTRACT cases per catalog enum type, assert
   each resolves locally (same owner/kind/type predicate plus name match),
   emit contracted names + iOS versions. Local-only cases are ignored.
4. Method/constructor sites: look up the contract entry by the decision-10
   key; absent entry is a hard error directing to refresh. Assert the catalog
   selector still resolves locally; emit contracted values.
5. Provenance-only selections (recipe methods, helper ctors) keep today's
   select* calls unchanged; they already throw on drift.
6. `unmappedModifiers`, `coverage`, and contract entries unreferenced by the
   current catalog are carried forward verbatim (catalog-matched output in
   catalog order, orphans appended in contract order; fixed key order always).
7. Write outputs (or `--check` compare, unchanged).

Refresh mode (`--refresh-contract`) runs today's open-world logic over the
full local inventory, writes `refreshedOn`, and rewrites the manifest
completely (additions and prunings alike land in the reviewed diff).

Error formats (exact, unit-tested):

- `contract <Kind> <id> is not in codegen/swiftui-manifest.json: run bun run
  generate:refresh-contract to update the contract`
- `contract <Kind> <id> does not resolve in the local SDK (<version>): the
  contract needs a refresh (bun run generate:refresh-contract)`

### Work plan

Unit 1 (additive, zero behavior change): `codegen/contract.ts` (pure lookup /
assert / carry-forward helpers) + `tests/contract.test.ts` (fixture manifest
+ fixture inventory: hits, misses, stale carry-forward, error strings).

Unit 2 (semantic switch): generate.ts (contract load, restriction, flipped
loops, `--refresh-contract`, `refreshedOn`), inventory.ts (readInventory
module allowlist), package.json (`generate:refresh-contract` script), README
generation paragraph (contract/refresh flow). Then regenerate: expect the
manifest diff to show ONLY `+refreshedOn` (same SDK 27.1, same catalog; any
further diff is reviewable signal, e.g. unmapped churn if the merge regen ran
elsewhere).

Unit 1 then unit 2, in that order; two commits. No catalog, ios/, android/,
or adapter changes in either unit.

### Validation plan

- Local (27.1): `generate:check` green; `--refresh-contract` run twice with
  the second a no-op; `ListStyle` still 6 cases in the manifest;
  `roundedBorder` still absent everywhere; `tsc --noEmit`; `vitest run`.
- CI (26.4, coordinator's lane): `generate:check` green. This is the money
  proof and cannot run locally (single Xcode here).
- Negative paths (missing-locally, not-in-contract errors) are covered by
  unit tests with fixture inventories; there is no local E2E for them by
  construction (it would require a contracted declaration absent locally,
  which is exactly the state the new flow refuses to persist).
- Highest-risk validation: the ceiling-CI green run after refresh, since it
  is the only step that exercises a second real SDK.

### Risks / rollback

- Refresh run on a stale SDK bakes removals back in (roundedBorder returns)
  and newer SDKs red with the clear contract error. Mitigation: the
  refresh-newest rule plus the `refreshedOn` audit trail.
- A back-available newest-only declaration could red ceiling CI after a
  refresh. Mitigation: documented escape hatch (human prunes in a reviewed
  commit). Never observed; the selected set is small.
- Rollback: revert the unit-2 commit. The manifest stays valid for the old
  generator (it rewrites the file wholesale, dropping `refreshedOn`).

### Open questions

1. Refresh discipline: confirm refresh runs on the newest supported SDK
   (currently local 27.1) rather than the ceiling, per decision 7. If the CI
   lane prefers ceiling-side refresh, the removal case needs a different
   answer and the design changes.
2. Should CI also run `generate:check` on a latest-Xcode lane to catch
   newest-side reds early, or is ceiling-only validation plus local newest
   runs sufficient?
3. Dashboard totals stay SDK-local while mapped counts are contract-stable
   (constraints). Acceptable for the hill-climb, or should a follow-up pin
   totals to the contract too?

## Done

- MERGERESOLVED: generate.ts conflict resolved keeping both sides (my
  coverage block + CI lane's requirements-omitted comment). `bun run generate`
  reproduced the staged regen outputs exactly (no additional staging needed);
  roundedBorder is back via present() semantics (225 mapped symbols).
  generate:check verified, tsc clean, vitest 84/84. Staged generate.ts only;
  coordinator commits the merge. Follow-up queued post-merge: switch my
  selectEnumModifier + coverage shape predicates from available() to
  present() (untouched: other files were frozen mid-merge).
- present() follow-up done: selectEnumModifier and the coverage shape
  predicates resolve/count present() declarations (soft-deprecated API the
  SDK ships keeps working), with unit tests for both. tsc + vitest green.
- Emitter wiring done: emitControls takes the inventory and derives the body
  via deriveLeafSwift for the five adopted leaves (Text, Label, Gauge,
  Toggle, Stepper), asserting byte-equality against the hand-written body as
  oracle. Proof: regen after wiring changed zero outputs; generate:check
  verified, tsc clean, vitest 108/108.
- CI green on the branch (run 35414353719): generate:check, Dev + Prod
  builds, 4-way e2e. The present() merge fixed the roundedBorder red.
- Review fix taken: cherry-picked 4c8f55b59 (positional leaf-arg validation
  + proof test) as da07a7161; derive 14/14, generate:check verified.
- Unit 1 static view-config done: codegen/emitViewConfig.ts replicates the
  babel plugin splice (same parser/generator/printer); tests/viewConfig.test.ts
  proves byte-parity over all 53 src specs plus Commands/removal/negative
  cases (56/56). generate:check verified, vitest 166/166. tsc is red on
  ios-views' assembly (see Blocked); zero errors in Unit 1 files.
- Unit 2 staticSpecs build step done: `tamagui-build && bun
  codegen/staticSpecs.ts` rewrites all 53 specs x 5 dist mirrors (265 files)
  into static view configs (esbuild strip per format, maps regenerated,
  fail-loud on unmapped specs, idempotent). Artifact-test: 0 codegen calls
  and 0 TS leftovers across all mirrors, both formats parse, maps valid.
  generate:check verified, vitest 176/176, tsc clean (ios-views fixed their
  call sites mid-flight).
- Types regen committed as dbebce71e (25 files, verified 25/25
  byte-identical to Sol's aa65497d7 before committing).
- Merge gate (p47830) done: (1) formatForMirror splits both separators +
  backslash tests; (2) removed the forbidden string-existence tests from
  viewConfig/staticSpecs suites (byte-parity + throws + mapping tests stay);
  (3) tests/nativeBundle.test.ts is the behavioral gate: real rewrite over a
  hermetic stage, bundled by real buildNativeBundle (resolver observed
  picking .native.js), executed in VM, asserts registry name + config. RN
  leaves stubbed at load (device provides them); require() output kept per
  reviewer. Runner fail-loud guards kept (build errors, not weak tests).

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

- (M1 build half CLEARED by CI green run 35414353719.) Remaining:
  floor-17 runtime behavior, which the coordinator folds into local
  simulator runs.

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
- (resolved) ios-views fixed the spacing call sites mid-flight; tsc clean.
- 3 red suites are ios-views' assembly (not mine): groups/lists fail on a
  broken react-native mock (no View export), components on a wrapper test.
  Their test files + adapters are dirty in the tree; flagged.
