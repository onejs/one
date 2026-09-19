# One Native superset: ios-views status

## Now

Milestone 2: ControlGroup, DisclosureGroup, Divider, Link, Group, Overlay,
SwipeActions, pager-style tabs.

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

## NEEDS-BUILD

- cdebd0595: xcodebuild the 4 new ComponentViews (.mm is pattern-mirrored
  but uncompiled here) and run the new lists suite
  (`--suite lists`). The suite is unverified: swipe-anchoring and
  lazy-materialization assertions were written blind. Fixture rows use
  composed Text/Button/Toggle/Section only.

## Blocked

(none)

## Queued

- M1 remainder: List selection/edit/delete/move (Expo `selection`,
  `List.ForEach` onDelete/onMove, edit mode). Needs a row-tagging
  protocol our view-driven composition lacks: children arrive as views,
  not tagged data. Cleanest after milestone 4 lands the `tag` plumbing;
  index-based selection is the fallback subset. Not started.
- Rnx lane finding, slot into milestone 2/3:

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
