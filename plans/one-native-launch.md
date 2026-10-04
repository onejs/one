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
| 5 | unified primitives | background work (`platform/background-tasks`) proven on iOS, Android and web in a real app, documented; next candidates chosen from what Contrast and the templates still import per platform | after rank 2 reports |
| 6 | coverage gaps | Expo UI and Expo modules still imported by our apps or templates, closed by the path the split below assigns | after rank 2 reports |
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

## workers

| session | runner | item | review |
| --- | --- | --- | --- |
| s8153 / contrast-one-native-2 | Codex xhigh | rank 1 | manager reviews assembled |
| s8223 / one-native-realapps | Sol high | rank 2 | manager reviews assembled |
| s8225 / one-native-worklets | Sol high | rank 3; finished | reviewed |
| s8227 / one-native-speed | Sol high | rank 4, parked; finished | none |
