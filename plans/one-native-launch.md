<!-- plan: status=active owner=m19584 reviewed=2026-10-03 -->

# One native: launch

Nate's goal: "if you use it with a single package, you basically can build a
first class amazing app on all the platforms". Web brings its own visuals,
and the hooks and primitives work there too.

Structure (Nate, 2026-10-03): `one-native-manager` (Opus, medium) reviews,
directs and gives feedback. Sol workers build (`codex-sol-high`, or
`codex-sol-xhigh` for hard work), at most four live. Every change gets a
cross-model review, assembled per item, never per slice. Visible changes
reach Nate as before/afters; new public One APIs wait for his OK. One main
needs Nate's direct word; `v2-beta` takes fixes and betas freely.

Detail lives in the existing plans; this file holds the order:
`one-native-coverage.md`, `one-native-ios-coverage.md`,
`one-native-android-lane.md`, `one-native-speed.md`,
`one-native-api-conventions.md`, `one-ui-portal-pager.md`, and Contrast's
`plans/contrast/mobile-app/one-native-next.md` (goal 4).

## ranked queue

Ordered by Nate's six axes: works, tested in real apps, speed, coverage,
docs, unified primitives.

| rank | item | done means | owner |
| --- | --- | --- | --- |
| 1 | Contrast goal 4 | `one-native-next.md` done-means on Contrast main; Widgets hero shared to Nate; Android/browser mount blocker stays with the engine owner | s8153 / contrast-one-native-2 |
| 2 | real-app matrix | the starter, every `create-one` template and Contrast's mobile template build and run on iOS 27 sim and Android emulator from a clean install of the current beta, each One native API they use exercised once; failures fixed on `v2-beta`; the matrix is a script anyone reruns | s8223 / one-native-realapps |
| 3 | worklets and Reanimated first class | steps 3 and 4 landed (3b3e99560, reviewed): One's transform owns worklets, Babel fallback removed, faster bundles recorded in `one-native-speed.md`, layout, gesture and runOnUI proven on iOS 27, Android 37 and Chromium. Steps 1, 2 and the step 5 proposal wait for Nate on `feat/native-blessed-packages` (`plans/one-native-worklets-proposal.md`). Open: vxrn engine suite red on HMR timeouts and one source-map assertion, not yet attributed | Nate review |
| 4 | speed rows | parked by Nate 2026-10-03 ("just leave speed for now"); row states in `one-native-speed.md` (04b32bfe1); unlanded work on `tm/one-native-speed-parked` (5d2a77c49). Android FileSystem, Motion and ImageManipulator (they throw on Android today) move to rank 6 | parked |
| 5 | unified primitives | background computation (Contrast `packages/contrast-native/src/background`: worklet runtime on native, Web Worker on web) upstreamed as one One primitive on a branch, proven iOS, Android, web with the rally course, shared to Nate; Android OS background tasks recorded as a rank 6 proposal; next candidates from the per-platform survey | s8381 / one-native-background |
| 6 | coverage gaps | Expo UI and Expo modules still imported by our apps or templates, closed by the path the split below assigns | s8377 / one-native-android-modules (Android FileSystem, Motion, ImageManipulator; engine suite attribution); the rest after rank 2 reports |
| 7 | docs | every shipped One native API has a page with props matching types (drift suite stays green), a hero where the page family has one, and a web behavior note | folded into each item; sweep last |

## coverage split

Go deep on one path and cover only what is unique in the others, so no
proof exists three times.

- One native (`One.*`, `One.UI.*`, `One.iOS.*`, `One.Android.*`): the deep
  path. Every behavior an app needs gets its runtime proof here, on device,
  iOS and Android.
- Pure SwiftUI (s7767 / swiftui-coverage): Peach rendering conformance of
  SwiftUI itself. Swift language, runtime, Foundation, UIKit from Swift and
  compile and bridge simulation belong to s7979 / peach-swift. They do not re-prove One
  behaviors; One's generated SwiftUI views take their visual conformance
  from s7767's evidence instead of a second capture.
- Apple frameworks (m19590 / apple-native-manager, split in Contrast
  `plans/peach/apple-native-coverage.md` "one proof per surface"): WebKit,
  Combine, Security, Network, ATT, notifications and location prove the Swift
  API once in that lane; One reuses or links that proof. MapKit (`Swift.Map`)
  is led by this lane.
- Expo UI: only what One does not cover. Expo UI parity is a pixel oracle for
  Peach, owned by s7767 (iOS) and r53511 (Android); One's lane does not build
  Expo UI proofs.
- Android (r53511 / android-manager): regular mobile Android first. Android
  Expo UI visual conformance stays there. On-device One.UI.Pager return and
  draft behavior and the regular-phone composer/IME proofs belong to p56058
  under r54227; this lane reuses those retained proofs and does not rebuild them. One's
  Compose surface is proved in r53511's lane; this lane only adds One API
  behavior tests that are platform-neutral.

## rank 5: unified background computation

Manager correction: Contrast needed CPU computation, not OS background scheduling.
`contrast-native/src/background` already owned latest-revision semantics, but Rally
still selected executors with `.native.ts` and a hand-written worker entry.

Implementation branches: One `feat/background-computation` off `v2-beta`, Contrast
`feat/one-background-computation` off `main`. Nate approved the API and migration via share-file-s8381-044922d32c30da74-1a1045f462d-32c3521720f43187 on 2026-10-03. Assembled review: m19584.

TESTED: real Rally hook on iOS 27, Android 37, Chromium development and production. Contract probes proved worker/worklet runtime identity, latest revision 3, current errors, disposal and hook freshness. SSR creates no worker. Retained outcomes, screenshots, exact scope and repeat commands: `tests/native-features/evidence/background-computation/README.md`.

One source commit `f8e56cdc`; Contrast migration `fe0484e86f`. The One change is based on v2-beta `5808e174d`, including the explicit Android device selector fix. Main is untouched.

RAN: One API and docs landed on v2-beta `4395848b3`; result-retention fix
`75982e8ee` removes output references from React state while retaining exact current
result identity. The browser retention probe proves replacement, disposal, reactivation,
and six accepted executions; it makes no heap-collection or phone-memory claim.

Shared compiler follow-up: Vite and Contrast use the same portable
`vxrn/background-computation` transform. The native compiler entry validates
capture globals and Hermes loops before Worklets serialization. m19584 approved
source `30bcc005b`; compiler `c2a262012` and logical proof commit `6b5302bdc`
landed on v2-beta. RAN: fresh One/dependency build passed 14 targets and the
compiler/plugin suite passed 39 tests. Nate directly approved the shared preview
item `share-file-s8381-044922d32c30da74-1a104bc4215-cfea721aa21064ad`.

RAN: automatic Release succeeded. Exact npm tarballs
`2.0.0-0.canary.1791084352120` contain One background, both compiler SDK entries
and ESM/CJS worklet utilities; all identify source `6b5302bdc`. Receipt:
`contrast-preview/published-tarballs.json`. The earlier branch dispatch failed
on One's Vite worker.plugins declaration signature; the existing beta fix
`a4c1ed5a5` corrected it. Its log was fetched once. The earlier ref-tip hypothesis
was wrong; the timeout and before-publication negatives remain retained.

Contrast release branch `feat/one-background-computation-release` pins the whole
family at `37d5b7ac11`, with native lock sync `470fda43fc` and check integration
`bec04162b5`. TESTED: installed files match packed tarballs; the real Rally hook
passes both custom preview runtimes with exact seven-field comparison, 37 objects
and native heartbeat 8. These receipts are in `contrast-preview/published/`.
RAN: 130 bundler tests / 348 assertions, bun check, seed/dependency checks and both
template typechecks pass. Pod sync proves byte-identical iOS sources and an
unchanged fingerprint; OTA runtime 84 is retained. The browser worker budget
passes at 96.6 KB gzip. No full phone build or full playable game boot is claimed.

RAN: both public compile catalogs serve the exact pinned family after watcher
`w-2b69` completed. Publication run:
https://github.com/sootbean/soot/actions/runs/37174653372.
The current and legacy contrast-native source descriptors return 200 for both
configurations. The complete canonical Home Rally factory seed now passes with
15 routes, 427 files, 14,391,496 bundle bytes and a complete graph. It uses the
actual factory source reader and published native build pipeline; Home Rally is
a canonical example, not a newly published registry entry.

TESTED: pushed Contrast candidate `b5f14fddd` merges current main `4def3f39bd`
with the published feature, preserving the new pure assetCollision extraction.
Both actual preview runtimes match all seven fields for 57 objects and four
checkpoints/legs; native heartbeat reaches 11. The complete canonical factory
build passes 15 routes, 450 files, 14,457,330 bytes and a complete graph. Receipts:
`contrast-preview/final-main/`. The intermediate candidate passed bun check and
130 bundler tests / 348 assertions; compiler/tests/package graph are unchanged,
and the merged allowlist check passes. The proof derives expected metrics from
the current starter model without weakening comparison or deadlines. Assigned
assembled adapter review requested two changes before Contrast main: preserve
ordinary resolver defaults and retain Blob URLs through Worker startup. Follow-up
8f3896a221 scopes browser/import conditions to the computation boundary and
releases URLs on first message/error/disposal, with constructor cleanup. RAN:
nine tests pass; both restored before behaviors fail negative controls. TESTED:
WebKit and Chromium match the real57-object course and observe Blob URL revocation
after the first reply. Native preview matches it with heartbeat9. RAN:131 tests/
356 assertions, bun check58.8s and97.0KB gzip budget pass; the complete factory
graph retains15 routes/450 files/14,457,330 bytes. Evidence is under
contrast-preview/review-fixes/. Assigned m19584 re-review passed8f3896a221. The synced landing merge
df23ed5000 includes the pin and removes its goals row; nine adapter tests,
compile-catalog gate and seven-field current/reference comparison pass. It is
pushed on merge/one-background-computation-land. Main push is blocked before
execution by the One-scoped tool guard despite an explicit Contrast target;
m19584 transferred landing to coordinator m18386 in a Contrast-context
session and directed this lane to finish. Receipt is contrast-preview/landing/.
One main is untouched. Main landing is pending with that owner, not claimed done.

Proposed public shape (`one/background`):

```ts
import { defineBackgroundComputation, useBackgroundComputation } from 'one/background'
import { calculate } from './calculate'
export const computation = defineBackgroundComputation(calculate)
// in a component, with memoized input:
const { result, getCurrent } = useBackgroundComputation(computation, input)
```

RAN: surveyed all Contrast template app source, `templates/contrast-mobile`, One
`examples/` and `packages/create-vxrn/src/templates.ts` for `Platform.OS`, platform
filename variants, and Expo/React Native package imports. The included Basic
starter is `examples/one-basic`; Takeout Free is an external repo and its local
checkout is absent, so its app source is not claimed surveyed. RAN: the Basic
starter branch `origin/v2-beta-starter` (`bd6044cc3`) has no diff from this source
under `examples/one-basic`, so the included starter survey covers the scaffold. Evidence describes
Contrast source at `3eb55ee237` and One at `69591350d`, before this branch's edits.
Generated icon files and intentional Apple-only chrome were excluded from ranking.

The next candidates are proposals or migrations only. None is implemented here.
INFERRED priority uses observed duplication, reuse across apps and implementation
cost, rather than a package-import count alone.

| priority | next unified job | source evidence and current limit | cost and next proof |
| --- | --- | --- | --- |
| 1 | persistent key/value cache provider | `contrast-mobile/data/zeroKvStore.ts` chooses IndexedDB; `.native.ts` imports Zero's op-sqlite provider. `One.Database` currently throws on web. App restart and cache recovery also split in `data/zeroRecovery*`. | Medium: define persistence, transaction and reset semantics independent of Zero; prove cold reopen and atomic reset on all three platforms. Keep Zero's own protocol in its adapter. |
| 2 | speech transcription | `contrast-mobile/interface/chat/useComposerSpeech.ts` only provides conformance behavior and an unavailable message; `.native.ts` uses `systemSpeechEngine.native.ts` over `One.Speech`. One's web `Speech.start` throws. | High: browser support and permission policy differ; proposal needs a deliberate unavailable contract and event/session ownership, then real microphone proof. |
| 3 | app restart | `contrast-mobile/features/ota/appRestart.ts` reloads the page; `.native.ts` chooses One.Updates versus DevSettings. Called by cache/diagnostic/OTA workflows. | Small to medium: one explicit restart operation covering development and staged OTA, with unsaved work semantics. Prove a boot marker changes exactly once without duplicate listeners. |
| 4 | material blur | `contrast-mobile/interface/effects/BlurView/BlurView.tsx` duplicates intensity/tint CSS mapping; `.native.ts` wraps `One.UI.Blur`. Flights carries the same split. `interface/effects/GradientBlurView.tsx` also branches for Android. | Medium: establish web material rendering and shared prop meanings; compare all three backdrops, then migrate wrappers. Subjective visuals require Nate. |
| 5 | alpha mask and fade | `templates/app/interface/effects/MaskedFade/MaskedFade.tsx` uses CSS maskImage; `.native.ts` constructs One.UI.Mask with a gradient view. App-empty and flights repeat it. | Medium: shared alpha-mask source and clipping/size contract, with a background-visible negative control. Keep app composition out of One. |
| 6 | document selection, migration to existing One API | `contrast-mobile/helpers/media/documentPicker.ts` warns and returns null; `.native.ts` uses One.DocumentPicker. One's web implementation already opens a file input and returns blob URLs. | Small: existing API migration, no new primitive needed. Prove cancel and byte reads, and own blob URL lifetime. |
| 7 | GPU canvas and pointer input | `templates/game/features/scene/SceneCanvas.tsx` uses R3F Canvas; `.native.ts` owns RN WebGPU layout, a canvas shim and PanResponder-to-pointer bridge. Same rendering job, large app-owned adapter. | High: consider a blessed integration before adding public API; prove picking, capture, resize and disposal under real GPU load. |

One Basic's only `Platform.OS` branch is the document shell in `app/_layout.tsx`;
its native tabs and widget demo deliberately expose native UI. Testflight's
`HomeLayout.native.tsx` and split/toolbar routes deliberately demonstrate Apple
chrome. These are not evidence that computation, storage or other shared jobs
need separate app implementations. Platform-specific auth callback URLs,
telemetry metadata and Apple sign-in visibility likewise describe real platform
policy and are not ranked as a primitive gap.

## rank 6: OS background task proposal

RAN: `One.iOS.BackgroundTasks` declares an iOS-only Nitro spec and Swift
registration in `nitro.json`; its native wrapper throws on Android. Web methods
also throw `BackgroundTasks requires an iOS native build`. There is no Android
WorkManager implementation to force-run. Keep the existing iOS scope honest.

Android support is a new capability proposal: task identifiers/kinds in prebuild,
WorkManager dependency and manifest registration, headless host startup, native
listener delivery and completion/expiration ownership, constraints and pending
queries, plus a common public namespace. Prove actual `adb shell cmd jobscheduler`
execution and process cold launch before claiming parity. A web OS scheduler
contract needs its own product decision; a running page's computation worker
cannot provide OS background-launch guarantees.

## worklets and Reanimated

How One treats them today (RAN `grep` over `packages/`, read the files named):

- Both are optional peers of `one` (`packages/one/package.json`), dev-pinned
  at reanimated ~4.6.0 and worklets ~0.12.2, and the install docs list them.
- One already depends on worklets at runtime: its native sync state
  (`platform/syncInstaller.native.ts`) imports `react-native-worklets` to
  reach the UI runtime. So any app using One's sync hooks needs it, while the
  peer says optional.
- One ships its own worklet transform (`packages/compiler/src/transformWorklets.ts`,
  keyword-gated, React Compiler aware) and `workletImportsPlugin` in vxrn for
  pure imports inside worklets. The config comment in `vite/types.ts` still
  describes a babel fallback for Reanimated files.
- "Blessed" exists only as a word in `one-native-ios-coverage.md`: a third
  party library One recommends instead of wrapping (op-sqlite, file system,
  image). No list, no version pin, no check.

Proposal:

1. Define blessed in one place: a typed list in `one` (name, pinned range,
   why, platforms) that the docs page, the starter's `package.json`,
   `one prebuild` and a doctor check all read. Initial set: worklets,
   Reanimated, gesture handler, screens. A blessed package is installed by
   the starter, version-checked at prebuild, and tested in the real-app matrix.
2. Make worklets and Reanimated required native peers (keep them optional on
   web-only apps): One already needs worklets, so the peer meta is wrong today.
3. One transform owns worklets with no babel path: measure cold and warm
   native bundle time against the Reanimated babel plugin on the starter and
   Contrast mobile, and delete the stale babel fallback text and code if the
   measurement holds.
4. Prove it in the real-app matrix: a Reanimated layout animation, a gesture
   worklet and `runOnUI` on iOS, Android and web.
5. One APIs that produce per-frame values hand them to worklets: Pager page
   offset, Motion sensors and keyboard height as shared values, readable on
   the UI thread with no JS hop. This is new public API and waits for Nate.

## namespaces (Nate, 2026-10-03)

Unified APIs live at the root of `One` (`One.FileSystem`, `One.Motion`, ...),
never under a platform. `One.iOS` and `One.Android` hold the generated,
platform-specific API, which is fuller and exact to the platform, never an
alias of a unified one. s8377 moves the misplaced uniform namespaces up.

## per-frame values: decision

Revises step 5 of the proposal (RAN: read `ui/Pager.native.tsx`, the Pager
spec, `syncStore.ts`, and s8225's `plans/one-native-worklets-proposal.md` on
`feat/native-blessed-packages`):

- Reanimated already ships UI-thread keyboard height (`useAnimatedKeyboard`)
  and sensors (`useAnimatedSensor`). One adds no `useKeyboardHeightValue` or
  `useMotionValue`; those would be a second way to do the same thing.
- One adds no SharedValue type of its own for animation. Reanimated's shared
  value is the one an app animates with, so One's producers feed it.
- The real gap is One's own components that emit per-frame events. Pager
  sends `onPageScroll` as a Fabric direct event, but its ref is an imperative
  handle, so `Animated.createAnimatedComponent` and Reanimated's worklet event
  handlers can't find the view (GUESSED; first step proves it either way).
  The work: Pager (and any other One view with continuous events) works with
  Reanimated worklet event handlers on the UI thread, with no JS hop, proven
  on iOS, Android and web. Any new prop (such as accepting a shared value
  directly) is shared with Nate before landing.

## workers

| session | runner | item | review |
| --- | --- | --- | --- |
| s8153 / contrast-one-native-2 | Codex xhigh | rank 1 | manager reviews assembled |
| s8223 / one-native-realapps | Sol high | rank 2 | manager reviews assembled |
| s8225 / one-native-worklets | Sol high | rank 3; finished | reviewed |
| s8227 / one-native-speed | Sol high | rank 4, parked; finished | none |
| s8377 / one-native-android-modules | Sol xhigh | rank 6 | manager reviews assembled |
| s8381 / one-native-background | Sol high | rank 5 | manager reviews assembled |
| s8395 / one-native-pager-reanimated | Opus high | per-frame values decision | manager reviews assembled |
