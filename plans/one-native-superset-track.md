# One Native superset track

Goal: `one` becomes a strict superset of Expo UI on iOS and Android,
with auto-generated Swift + TypeScript that matches Apple APIs as closely as
possible. End state: run a script, get the library. Hill-climbed in shippable
steps, not one shot.

- Base: `v2-beta` (carries the ios-17 floor merge; origin/main raised to 26).
- Branch: `feat/one-native-superset` (never main; coordinator pushes).
- Worktree: `/Users/n8/.worktrees/one-native-superset` (all workers share it).
- iOS floor: 17. iOS 26-only API (glassEffect, tab roles, badges) must be
  availability-gated, never the deployment target.
- Scope is native iOS + Android only. One-native never does web/canvas;
  rnx/Contrast icons go lucide (per-app icon consts), not through us.
- SDK ceiling: MAXIMUM_IOS=26 (CI lane commit 7cc558e69; CI pins Xcode 26.4).
  Never bump it or commit post-26 symbols without a CI Xcode bump, or the
  branch re-reds. Regen output must be identical on any newer toolchain.
- v2-beta 1c5f1aa5e (green) merged in; merge hold lifted.
- Coordinator (Muse session `fallow-suhail`) runs all heavy builds
  (xcodebuild, gradle, conformance suites) and validates assembled work.
  Workers run cheap gates only: `generate:check`, `tsc --noEmit`, `vitest`.

## Workers and ownership (hard boundaries)

| Worker (slug) | Owns | Must NOT touch |
|---|---|---|
| `native-codegen` | `codegen/{generate,inventory,emitControls,emitContainers,emitPopover,emitSheet,emitStyle,measure,menuValidator}.ts`, `Extract.swift`, `VerifyControlled.swift`, floor/version plumbing, coverage dashboard | `catalog.ts`, `*Catalog.ts`, hand-written `ios/`, `android/`, `src/*.native.tsx` |
| `native-ios-views` | `catalog.ts`, `*Catalog.ts`, `src/generated/`, `src/specs/`, `ios/Generated/` (regen only), new view `.native.tsx`, component docs | `emit*.ts`, `inventory.ts`, `generate.ts`, `Extract.swift`, `android/`, floor work |
| `native-android` | `android/`, `src/compose*`, Compose docs/tests | `ios/`, `codegen/`, Swift `src/` |

`schema.json` and `src/generated/swiftui.ts` are regen output: whoever regenerates
last wins; never hand-edit. On any git conflict: abort, restore, flag in your
status file; the coordinator resolves.

## Milestones

1. Floor at 17 everywhere + coverage dashboard (mapped vs unmapped views and
   modifiers per SDK overlay module). [codegen] (done)
2. iOS parity views: List, ScrollView, LazyHStack/LazyVStack. [ios-views] (done)
3. iOS round 2: ControlGroup, DisclosureGroup, Divider, Link, Group, Overlay,
   SwipeActions, pager-style tabs. [ios-views] (in flight)
4. Generic emitters: generic leaf emitter + generic enum-modifier emitter driven
   by inventory; less per-control hand code. [codegen] (in flight)
5. Modifier expansion toward the Expo modifier list (priority: first thing
   after M3). Design note first: composable modifiers array vs swiftStyle
   extension, agreed jointly since emitStyle is codegen's and catalogs are
   ios-views'. Then groups in order: text styling, gestures, scroll +
   list-row config, presentation detents, effects, accessibility.
   [ios-views, codegen supports]
6. `useNativeState` equivalent (observable shared state). [ios-views]
7. Overlay mining: LocationButton, Sign in with Apple, StoreKit, Translation,
   MusicKit, Charts if parseable. [ios-views]
8. Android: TextField, Slider, Dialog, LazyColumn, Card, Chip, Checkbox,
   RadioButton, ProgressIndicator, BottomSheet, NavigationBar, Icon, Snackbar,
   SearchBar, DropdownMenu + declarative registry. [android]
9. Targeted imperative UIKit wrappers, auto-generated where the SDK allows
   (document picker, Safari view, StoreKit flows, haptics...). Later milestone.
   Sequenced by the Expo top-50 + soot-template survey (worker
   expo-supersede-survey, doc lives in the soot repo, never here).
   Nate direction (via Sol verification): hand-curated coverage is intentional.
   The catalog chooses which official APIs/components One exposes; generation
   enforces alignment (names, types, signatures, availability, behavior) for
   that selected surface only. Never pursue full SDK coverage. Cohesive One.*
   and One.UI.* stay authored above the generated platform bindings.

## Protocols

- Status files (each worker updates only its own):
  `plans/one-native-superset-codegen.md`,
  `plans/one-native-superset-ios-views.md`,
  `plans/one-native-superset-android.md`.
  Sections: `Now`, `Done`, `NEEDS-BUILD` (commit SHAs needing coordinator
  builds), `Blocked`.
- Commits: explicit pathspecs, narrow, on this branch. Never `add .`.
  Coordinator pushes; workers never push.
- Messaging: no ACK or progress chatter. File handoffs only; the coordinator
  polls status files and transcripts.
- REVIEW: none per slice. Coordinator validates assembled work with builds +
  conformance before anything merges anywhere.
- Standing review rule (coordinator): assembled work gets a DeepSeek review
  before it lands. Spawn tm run --runner opencode-deepseek-v4.1-flash with
  the brief pointing at skills/code-review.md (Staffing section), demanding
  maximum-depth reasoning plus in-source verification of every finding.
  Revalidate agreed findings, land, then stop the reviewer. Applied at track
  merge time (and to the closed-world + static-config milestones when they
  land), not per green slice.

## Design findings (from rnx lane)

- Icon-only Button must be expressible directly. Expo renders an empty capsule
  for icon-only (systemImage is read only in the Label branch) and the
  workaround is `label=""`, which may leave Label's icon-to-title spacing
  applied and the symbol off-center (unmeasured). Our Button takes `systemImage`
  with a required non-empty `label` today; add an icon-only path that renders
  `Image` (not `Label` with an empty title) and prove symbol centering in
  conformance. Owner: native-ios-views.
