<!-- plan: status=active owner=r58954 reviewed=2026-10-04 -->

# Native blur acceptance

One's native blur repair is part of Contrast's spring cleaning campaign.
The governing downstream plan is `plans/contrast/mobile-app/one-native-next.md`.
The source branch is `tm/mechanical-native`; fixes land on `v2-beta` after
runtime proof and the assigned assembled review. One main remains held.

Nate, 2026-10-04: use `@sbaiahmed1/react-native-blur` directly for
"PLATFORM native" effects and "a real iOS progressive blur". Keep the
existing component and prop surface. "blur should just be behind the composer";
foreground chrome stays above it by layer order. This direction already lives
in `packages/one/src/platform/VENDORING.md`.

## preserved work

RAN: the complete preserved range is `95fabbee964..4383742b3f`, one archival
commit on `wip/one-native-blur-preserved-a22608-20261004`. Its tree is identical
to `3f65d0ae2` on `wip/one-native-blur-a22608`. Freshly fetched `v2-beta`
at `3d5841af0` has not adopted those native changes. The shared tree was
rebased while pristine and its locked dependencies installed once.

The draft includes a temporary capture log, custom Android sibling traversal,
and an unrelated native-source fixture stub. Those are excluded from adoption.
The source archive and native receipts remain recovery evidence. Their
preservation does not establish native acceptance.

RAN: the existing effects analyzer passes both saved iOS before and after
captures. It does not distinguish the requested variable-radius backend from
the old effect stack. The saved Android after capture is blank and fails
with `no stripe zone found`; the Android before capture also fails.
Fresh runtime reproduction and exact upstream comparison precede native edits.

## upstream suitability

RAN: the exact npm `@sbaiahmed1/react-native-blur@6.0.2` tarball contains
`ios/Views/VariableBlurView.swift`. Lines 27-39 document its private
Core Animation dependency and App Store review risk. Lines 109-130 construct
`CAFilter` and `filterWithType:` from reversed strings and set filter inputs
through KVC. A symbol scan cannot establish public API suitability for these
dynamic calls. The preserved draft uses the same private backend.

Assigned review disposition, 2026-10-04: do not adopt that private backend
or conceal it with obfuscation. The exact iOS variable-radius requirement
remains unresolved and preserved. No public route meeting that requirement
has been established. Do not replace it with another stepped stack, change
the public API, or delete the existing feature. A final behavior choice belongs
to Nate. Existing behavior remains until a supported replacement is accepted.

The ordinary upstream `BlurEffectView.swift` uses public UIKit
`UIVisualEffectView` and `UIViewPropertyAnimator`. Its lifecycle and intensity
behavior can be evaluated independently of the held progressive backend.

RAN: Android's exact upstream source uses QmBlurView 1.3.0, rather than the
draft's custom RenderEffect capture. The published
`com.qmdeve.blurview:core:1.3.0` artifact declares minimum SDK 21, preserving
One's Android floor. Its capture and blur Java sources allocate work objects
per frame; artifact compatibility alone does not establish performance
acceptance or correct sharp foreground behavior.

## remaining acceptance

RAN, 2026-10-04: fresh Android API 37 probe compiled the current
`OneNativeBlurView.kt` alongside the exact QmBlurView 1.3.0 artifact. One
left the backdrop stripes sharp; the upstream view softened them. Fresh iOS
27 fixture at intensity 25 changed light to dark and back twice. Each round
left an opaque gray panel although the state still reported intensity 25.
Receipts: `android-current-vs-upstream.png`, `ios-current-25-light.png`,
`ios-current-25-light-cycle.png` in the evidence directory below.

The bounded public repair ports ordinary `BlurEffectView.swift` intensity
and lifecycle handling, omits its test-runner on/off branch, and wires only
the existing ordinary Blur component. Android capture remains under
evaluation against foreground order, software-canvas effects and allocations;
it is not accepted merely because it blurs this simple scene.

TESTED: ordinary iOS blur repair compiles on the unchanged platform floor and
runs on the claimed standard iPhone17Pro/iOS27. At intensity25, light/dark/light
returns to the initial sampled backdrop within 0.0071/255 MAE, versus
44.18/255 before the repair. Zero intensity restores sharp stripes (ROI
standard deviation127.49); full intensity uses the full material (0.98).
Native3x captures prove sharp foreground, rounded child clipping, scrolling
backdrop,75% scale, landscape/portrait and detach/remount. A verified Settings
foreground cycle resumes the same app PID9005 and state, with0.0/255 backdrop
MAE. A breakpoint on animator rebuilding records0 hits during actual backdrop
scrolling. Stabilization remains bounded to three ticks per mount/update.

TESTED: exact Qm1.3.0 captures an above-blur sibling into the backdrop. Outside
the sharp red square, red-minus-green averages60.74/255; hiding that sibling
reduces it to0.0. Zero radius restores sharp stripes. A shared-heavy exclusive
window measured300 moving frames on the standard Android17/API37 emulator:
capture plus blur mean0.866ms, p95 2.253ms; capture alone mean0.045ms. PSS
changed38,256->38,300KiB, native heap11,740->11,672KiB over five seconds.
These are emulator results, not physical-device acceptance. Stable memory does
not remove the per-frame work allocations found in the exact source.
Android capture adoption is held because this upstream route fails the
required foreground order and allocation constraints. No dependency patch,
custom traversal or alternate rendering path is introduced.

- Reproduce the actual failure with current native source and a named exact
  upstream reference on the same native device and OS.
- Prove moving backdrop, sharp foreground, clipping and child order, zero
  radius and intensity, mask continuity, tint changes, scale and orientation,
  foreground restoration, and detach/remount.
- Preserve mask and overlay modes and the existing platform support floor.
- Measure native capture frame cost and memory. Add no per-frame allocations,
  logs, recursive self-capture, or unsupported dependency patches.
- Inspect final artifacts for public/private symbol suitability, then exercise
  supported fixes downstream in an isolated Contrast worktree with
  `bun release --into <worktree>`.
- Obtain one assembled review from `m20266` before landing public fixes.
  The held progressive requirement does not block independently proven fixes.

The durable task is `t-muuixw8k-24b60`. Detailed source, receipts, hashes and
runtime evidence live outside the worktree at
`~/.team-machine/evidence/spring-one-native-blur/`. CI owner `spring-ci`
(`p60445`), with `m20266` fallback, owns subsequent canary and delivery checks.
