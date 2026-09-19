# One Native superset: ios-views status

## Now

Milestone 5: overlay mining (LocationButton, Sign in with Apple, StoreKit,
Translation, others the inventory covers). M4 implementation still waits on
the agreed modifier shape (coordinator sequencing); slotting it the moment
the shape lands.

## Done

- COMMITTED ebb9d2d8d (catalog.ts: OneNativeList/ScrollView/LazyVStack/
  LazyHStack components + listStyle modifier + ListStyle enum).
- Pre-freeze validation (generate ran clean before the mail was read, SDK
  27.1, 227 mapped symbols, iOS 17 swiftc typecheck + VerifyControlled
  passed): ListStyle resolves 6 cases, all at floor 17 or below (automatic
  13, plain 13, grouped 13, sidebar 14, inset 14, insetGrouped 14), so the
  List style prop needs no availability gate. Regen output was reverted
  commit-bytes to keep the merge clean; post-merge regen re-adds specs,
  schema, provider, and swiftui.ts entries. generate:check is expected-red
  until then (catalog ahead of regen).
- Never touched generate.ts; MAXIMUM_IOS untouched.
- COMMITTED f9f52070a (regen leftovers: 4 specs, package.json provider,
  types.ts ListStyle). Post-merge `bun run generate` + `generate:check`
  clean: SDK 27.1 toolchain, target 26, 224 mapped symbols, 163 files,
  iOS 17 swiftc typecheck + VerifyControlled passed.
- M1a shipped: COMMITTED cdebd0595 (12 native view files),
  52b59a64a (JS wrappers + 14 vitest), 27a671620 (lists fixture + suite
  + nav), 0f6490b47 (README). Gates: generate:check clean (covers the
  new Swift), tsc clean, vitest 72/72.
- COMMITTED af62ca94f (leaf recipes on Text/Label/Gauge/Toggle/Stepper;
  derive.test.ts byte-equality now proves the catalog recipes, fixture
  removed) + 7bffa1186 (WebView comment fix). generate:check green,
  vitest 84/84. Note: derive.test.ts edit is shared-test upkeep for the
  adoption, not a codegen behavior change.
- M2 shipped: COMMITTED e15ce32b8 (catalog: 10 components + icon-only
  Button leaf, regen), e9db157a5 (ControlGroup/Divider/Link/Group/
  Overlay/SwipeActions native), 40d930a15 (DisclosureGroup controlled +
  Pager reusing Tab pages via OneNativePageHost), ec37c087c (JS +
  compounds + 22 vitest), fcc1b9da5 (groups fixture + suite + nav),
  f324d1415 (README). Gates: generate:check clean, tsc clean, vitest
  106/106. Pager is a Tabs-twin (tag-based, no availability splits)
  rather than a Tabs style, so no tab-bar props go dead. Greedy-parent
  rejection now covers DisclosureGroup, Tabs, and Pager too.
- M3 shipped: COMMITTED b8cca4537 (useNativeState handle + exports),
  5e49223fb (state fixture + suite + nav), 68efaf5d4 (README). Design:
  pure-JS shared handle (Expo-shaped .value/.set/.get, stable identity,
  ref mirror) feeding controlled props; each view keeps its own ack
  stream, coherent under sharing. Out of scope, recorded: UI-thread
  sync writes (needs a worklets runtime we lack), object-as-prop
  (`text={handle}` needs generated-adapter support, emitter-side),
  native-direct view-to-view sync (registry + lifecycle follow-up).
  Gates: tsc clean, vitest 108/108, driver transpile clean.
- IOSFIX 85c925c51 (hand-written slot cpp shadow nodes for the two
  interfaceOnly M2 markers OverlayContent + SwipeActionsActions, mirror
  of the SheetContent pattern, byte-verified modulo names; .mm imports
  added). Audit: all 3 interfaceOnly specs (Tab pre-existing +
  these 2) now have cpp; every other M2/M1a .mm references only
  codegen-emitted descriptors. No JS/codegen inputs changed, so no
  JS gates apply; coordinator rebuilds + reruns lists.
- IOSFIX2: no new commit; both .cpp name definitions verified present
  in 85c925c51 (git show, byte-correct SheetContent mirrors). The
  undefined-symbol link error is Pods membership only: new .cpp files
  enter the Xcode project on pod-install, which the coordinator runs
  before rebuilding.
- LISTSFIX 1e3d37bb6 (finding 1: ScrollView wrapper default flex:1 set
  flex-basis 0, which Yoga honors over an explicit height, so both
  fixture ScrollViews ignored height 170/56 and all three containers
  split 594/3 = 198 each; default is now alignSelf stretch and the
  List keeps greedy flex:1, restoring its 368 allotment) + scheme
  bridge (finding 2: hosting controllers inherit dark traits from a
  dark parent VC while the app window is light, so transparent
  containers painted white-on-white; standalone List/ScrollView/Lazy
  roots now carry the host view's scheme via OneNativeSchemeBridge,
  standalone-gated so composed content still inherits). M2 same-root
  preventive: 008e8761b bridges Group/Link/ControlGroup/
  DisclosureGroup/Overlay/SwipeActions parents (markers inherit via
  capture). Gates: generate:check clean (swiftc typecheck covers the
  new Swift), tsc clean, vitest 108/108. Margin note: post-fix List
  viewport ends ~591 with Carrot starting ~577-579 (Orange precedent:
  partial rows appear in AX); if Carrot still misses, trim the
  fixture vertical height (170->150) as the known fallback.
- LISTSFIX2 87bee7abd (finding 2 rediagnosed: no trait split exists;
  sim is dark + plist Automatic, so window and hosting are both dark
  and the bridge correctly synced dark-to-dark. the defect was the
  fixture's hardcoded light chrome ('#fff' screen) against adaptive
  SwiftUI (white rows in dark mode): white-on-white. RN Text defaults
  to fixed black, which is why the footer stayed readable and the
  split theory looked plausible. fixture now adapts via
  useColorScheme in both modes; vertical trimmed 170->150 per the
  fallback, giving the List 388 and Carrot ~17-34pt in the viewport.
  the scheme bridge stays: inert when traits agree, and it guards a
  real split such as presented overlay content. gate: esbuild
  transpile clean; package gates untouched by a fixture-only change).
- LISTSFIX3 f4beedfdd (suite-side: plain/grouped style assertions
  assumed Carrot visible without scrolling, but the style relayout
  shifts section 2 below the fold. swipeRows now takes a prefix list
  so list swipes anchor to any visible list row; each style asserts
  status (+ Apple pre-swipe for plain), swipes Carrot in, then
  asserts Carrot. recycle assertions need no change: fresh mounts
  start at the top with section 1 visible. gate: bun build clean).

## NEEDS-BUILD

- cdebd0595: ComponentViews compile under CI (branch run 35414353719
  green); `--suite lists` now running on coordinator simulator, verdict
  pending. Suite was an unverified blind write: swipe-anchoring and
  lazy-materialization assertions. Fixture rows use composed
  Text/Button/Toggle/Section only.
- e9db157a5 + 40d930a15: xcodebuild the M2 views (Overlay/SwipeActions
  marker intercept, DisclosureGroup controlled events, Pager Tab reuse
  + host protocol, Tabs header protocol) and run `--suite groups`
  (unverified blind write; the icon-centering lookup is geometric and
  may need the real a11y shape). Suite never taps the Link (leaves the
  app) by design.
- 5e49223fb: run `--suite state` (pure-JS feature, no native build
  needed beyond the fixture compiling in). Unverified blind write;
  toggle-flip sequencing proves shared convergence without depending
  on CheckBox value shape.

## Blocked

(none)

## Queued

- M1 remainder: List selection/edit/delete/move (Expo `selection`,
  `List.ForEach` onDelete/onMove, edit mode). Needs a row-tagging
  protocol our view-driven composition lacks: children arrive as views,
  not tagged data. Cleanest after milestone 4 lands the `tag` plumbing;
  index-based selection is the fallback subset. Not started.
- Rnx lane finding, done in M2 (icon-only Button branch + centering
  proof in the groups suite):

- Icon-only Button: today `label` is required non-empty and `systemImage`
  only renders inside the Label branch, so Expo-compatible icon-only usage
  renders an empty capsule (their workaround is `label=""`). Add a path
  that renders `Image` rather than Label-with-empty-title (sidesteps the
  open question of whether Label reserves icon-to-title spacing for empty
  titles) and prove symbol centering in conformance.

## Design: modifier expansion (pulled forward, after M2)

Reference: Expo `modifiers={[...]}` — an ORDERED array of ModifierConfig
(`{$type, ...params, eventListener?}`), typed builder per modifier
(`padding({all: 16})`, `frame({...})`, `onTapGesture(fn)`), open set via
`createModifier`. Order is semantic in SwiftUI (padding-then-background vs
the reverse differ); value, enum, event, and state-carrying modifiers all
ride the one array.

Today: `swiftStyle` is a FIXED codegen struct (OneNativeStyle, 20ish scalar
fields from `styleFields`) applied in a FIXED chain order by
`.oneNativeStyle()`, controls only, no containers. Value-only: no
callbacks, no state refs, no ordering.

Option A (extend swiftStyle): new fields + per-field apply code. Rejected
for growth: fixed order bakes semantics forever, struct-per-field codegen
cannot cover 130 heterogeneous modifiers (EdgeInsets, UnitPoint,
Animation shapes are not scalars), and gestures/lifecycle/scroll-position
cannot cross as struct scalars at all.

Option B (recommended): an ordered `modifiers` array prop on controls AND
containers, Expo-compatible builder names and `$type` strings where the
SDK shape matches. Wire shape: `objects` payload, one row per modifier
(`$type` + params + optional event slot), applied IN ORDER by a generated
Swift applier that folds the chain (AnyView per link, the standard
data-driven-chain shape) calling the REAL SDK modifier per branch.

How generation drives it from the inventory (all existing machinery):

- New catalog surface (mine): one entry per modifier — SDK selector
  (name/parameters/requirements, exactly like `methods`/`styleModifiers`
  today), `$type`, param schema, kind (value/enum/event/state), floor
  behavior. Enum params reuse the existing `oneNative*` resolvers;
  new enums arrive via `enumTypes` (regen only, no emitter change).
- Emitter (codegen worker, emitStyle): payload + ordered applier +
  TS builders + per-`$type` validation, generated from the catalog.
- Provenance per modifier: `selectModifier` against the real SDK
  (throws on ambiguity/absence, the established rule); the swiftc
  typecheck gate compiles every applier branch against the SDK; the
  manifest records mapped modifier + iOS version; post-floor modifiers
  get the existing `#available` + JS version-assert treatment (needs a
  generated modifier-versions table beside `swiftUIValues`).
- Marginal cost per modifier after the applier exists: one catalog
  entry. That is the end state the track wants.

swiftStyle: freeze (no new fields), array is canonical. Two paddings with
different order semantics is two ways to do a thing; removal needs a
major bump, so: freeze now, deprecate in docs, removal tracked separately
(coordinator call, not this milestone).

Phasing: (0) array transport + applier + value/enum modifiers; text
styling proves it. (1) modifier events unlock gestures: one generic
modifier event (index, name, data) per spec — needs emitter + spec
surface agreement, and a ruling that DISCRETE events only ride it
(tap/long-press/appear/phase-change yes; continuous geometry no).
scrollPosition waits on useNativeState identity (M3); refreshable's
async completion is a protocol addition, phases last. Presentation
detents ride the sheet fixture, not the array.

Open questions for the codegen worker (emitStyle theirs; coordinator to
sequence): (a) payload column shape — fixed scalar columns (menu-nodes
precedent) vs `$type` + params-JSON with per-`$type` Codable decode;
(b) containers need the `modifiers` prop + applier call too
(emitContainers + hand-written views I own); (c) generic modifier event
on every spec vs narrower gesture surface; (d) modifier-versions table
shape. No implementation until the shape is agreed.

## Emitter features needed (codegen worker)

1. `Double`/`Float` prop import in the `catalog.ts` components spec template
   (`generate.ts` components loop only imports `DirectEventHandler, Int32`).
   Workaround: Lazy stacks ship alignment-only with platform-default spacing;
   `spacing` lands once the template carries the import.
2. Empty `configure` call in emitControls: a Control with zero fields emits
   `call[0].expression` on an empty array and crashes generate. Divider
   wants to be that Control (measured leaf); shipped the container route
   instead, same names, so it migrates cleanly once the emitter guards it.
3. Scheme bridge for Generated containers (emitContainers): the lists
   verdict proved hosting traits can disagree with the app window, and
   hand-written containers now carry OneNativeSchemeBridge
   (1e3d37bb6/008e8761b). Generated Pager has the same latent
   white-on-white; the emitter should wire the bridge (or an env
   colorScheme prop like Host/Form) for it and future Generated
   containers. Pre-existing transparent containers (ZStack/HStack/
   VStack/Glass) share the latent bug; coordinator/audit call.
