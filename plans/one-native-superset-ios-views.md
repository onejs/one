# One Native superset: ios-views status

## Now

Frozen per audit mail: will not run `bun run generate` until the audit
confirms origin/v2-beta is merged into feat/one-native-superset. Next after
unfreeze: regen, then native views + JS + tests for M1a.

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

## NEEDS-BUILD

(none yet)

## Blocked

- Audit merge of origin/v2-beta (SDK 26 ceiling) into
  feat/one-native-superset. Resume M1a native/JS work only after the
  all-clear; regen first.

## Emitter features needed (codegen worker)

1. `Double`/`Float` prop import in the `catalog.ts` components spec template
   (`generate.ts` components loop only imports `DirectEventHandler, Int32`).
   Workaround: Lazy stacks ship alignment-only with platform-default spacing;
   `spacing` lands once the template carries the import.
