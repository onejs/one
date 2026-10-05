<!-- proposal: status=awaiting-review owner=p61201 date=2026-10-04 reviewers=p61184,p60786 lane=beta-native-ci branch=tm/beta-native-ci -->

# One v2-beta iOS generated-binding repair proposal

No implementation until p61184 (first layer) and p60786 (substantive
native/portal gate) approve. No catalog, generator, native, handwritten
spec, or public API change is proposed.

## RAN: the failure

iOS Native Tests 37253320666 at v2-beta 95252a29d fails one step,
`bun run generate:check` (`packages/one/codegen/generate.ts --check`):

```text
error: Generated SwiftUI bindings differ:
src/platform/specs/OneNativePortalViewNativeComponent.ts,
src/platform/specs/OneNativePortalHostViewNativeComponent.ts,
schema.json, package.json
```

Local repro at tm/beta-native-ci 8631f54f9 (origin/v2-beta tip, Xcode
27.1 / SDK 27.1 vs CI 27.0) fails byte-identically: same 4 files, same
8 hunk headers (`@@ -3,6 +3,7 @@` x2, `@@ -930,7 +930,56 @@`,
`@@ -3914,55 +3963,6 @@`, `@@ -378,6 +378,7 @@`,
`@@ -401,7 +402,7 @@`, `@@ -409,6 +410,8 @@`,
`@@ -472,10 +475,7 @@`). Every other generator output matches, so the
drift is hand-edit caused, not SDK caused. Full logs:
`/tmp/one-beta-ios-failure.log` (CI), `/tmp/beta-native-ci-repro.log`
(local). Task t-muuqv2vs-11m20 holds the evidence index.

## TESTED: ownership cause

`src/platform/README.md` states the rule: change the catalog or
generator, regenerate; `generate:check` fails if any output differs.
Two commits bypassed it (both m18635, 2026-10-02):

- 3e1463ec4 (Portal) appended portal entries to the end of the
  `components` array in `codegen/catalog.ts`, then hand-appended the
  schema entries (line 3914) and package providers (after
  PopoverContent) and hand-created the two spec files. The generator
  emits `components` entries before controls/sheets/containers/popovers
  and emits a blank line after the spec import block (the empty
  interpolation line in `generate.ts` stays a blank line), so the
  checked-in tails and the missing blank lines drift.
- 9fb08b11d (Pager) added `OneNativePager` to the front of
  `handwrittenComponents` and renamed the mid-array `components` entry
  to `OneNativeSwiftPager`, then hand-appended SwiftPager to the package
  tail instead of regenerating. The generator emits providers as
  handwritten, components, controls, sheets, containers, contents,
  popovers, so checked-in order (stale mid Pager, tail SwiftPager and
  portals) drifts. Its schema rename landed in place and is correct.
- 81558502b and f8e56cdc6 touched only dependency pins and export maps
  in package.json; they preserved the drift and added none.

Senders: `catalog.ts` (`components`, `handwrittenComponents`),
control/sheet/container/content/popover arrays, the SDK inventory.
Receivers: `schema.json` feeds `react-native.config.cjs` (Android
descriptors, PortalHost included, Portal excluded as interfaceOnly),
`One.podspec` (minimumVersion only), and keyed test lookups;
`componentProvider` feeds RN iOS codegen and keyed test guards;
specs feed `Portal.native.tsx`, pod-install codegen, and the
`staticSpecs` dist rewrite. No receiver is order sensitive (verified:
no `Object.keys(provider)`, indexed, or snapshot assertions).

## Proposed fix

Run the generator once under the pinned SDK ceiling and commit exactly
the 4 drifted files:

```sh
cd packages/one
bun run generate        # writes 4 files, then swiftc typecheck + VerifyControlled
bun run generate:check  # must exit 0
```

No blind removal: generated output keeps all 98 providers and all 93
schema components with zero drops, adds, or value changes
(non-provider package.json and payloads byte-identical; SwiftPager
stays schema index 19; portals move 91,92 to catalog position 27,28).
The handwritten `OneNativePagerNativeComponent.ts` (owned uniform
pager spec) is outside `components`, so the generator never emits it.
Portal/pager props, events, slots, `interfaceOnly`, and the
`groups.test.ts` / `staticSpecs.test.ts` guards are preserved verbatim.

## Controls (run after approval, before push)

Positive (restored registration): `generate:check` exits 0; all 98
providers and 93 schema names resolve by key; portal/pager schema
entries deep-equal pre-fix content; `bun run vitest --run
tests/groups.test.ts tests/staticSpecs.test.ts tests/pager.test.ts
tests/lists.test.ts tests/containers.test.ts` passes.

Negative (missing provider): deleting one provider key from a copy
trips the keyed guard (`missing provider: <name>`, probe verified);
removing the regenerated blank line or shuffling provider order
re-fails `generate:check` with the same file listed.

Native compile: not required, no native file changes; the generator's
own swiftc typecheck plus VerifyControlled run inside `bun run
generate`. Commit is one pathspec commit of the 4 files with a
`Validation:` body, pushed to `tm/beta-native-ci` only. Manager
serializes v2-beta integration; CI owner stays p61056.
