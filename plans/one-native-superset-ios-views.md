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

## Emitter features needed (codegen worker)

1. `Double`/`Float` prop import in the `catalog.ts` components spec template
   (`generate.ts` components loop only imports `DirectEventHandler, Int32`).
   Workaround: Lazy stacks ship alignment-only with platform-default spacing;
   `spacing` lands once the template carries the import.
