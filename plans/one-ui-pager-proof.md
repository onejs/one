# One.UI.Pager proof

Branches: One `one-ui-pager`, Contrast `tm/one-ui-pager`. Nate approved the public API; both land once proven. REVIEW: none, assembled review owns it.

RAN: One build and Fabric codegen passed. The generated Android interface
has distinct `setScrollEnabled` prop and `setScrollEnabledImperatively`
command; the public ref still exposes `setScrollEnabled`.

RAN: One typecheck and native-features typecheck passed. Existing Swift pager
and group tests passed: 2 files, 28 tests. The renamed native host must still
pass these; changing its public selection contract would fail those checks.

TESTED: web with a headless Chromium probe. Initial page 1, instant page 2,
resize at page 2, RTL at page 2, animated page 0, vertical page 0, instant
page 2, removal of the last pages to page 1, and disabled overflow passed.
Screenshots: `/tmp/one-ui-pager-web-before.png`, `/tmp/one-ui-pager-web-after.png`.
A wrong direction or stale viewport stride would change the asserted
`position:progress` label or leave a fractional final progress.

RAN: Contrast `check:mobile-template` printed `0 type errors`. `bun deps`
reports the deferred pod graph change: pager-view 8.0.5 no longer autolinks.
Pods and the OTA runtime stay unchanged until landing, as assigned.

Spec correction: `OneNativePager` already named the SwiftUI host for
`One.iOS.Pager`. Its internal host, generated spec, catalog and Peach seam
are renamed `OneNativeSwiftPager`, preserving the public SwiftUI API, while
the new uniform component owns `OneNativePager`.

Native fixture route: `/one-ui-pager`. It provides keyboard, orientation,
RTL, resizing, margin, overdrag, child removal, disabled scrolling,
out-of-range commands, animated and instant commands, and a pager-view
8.0.5 benchmark selector. Reset immediately before one drag, release and
wait for idle, then report. Both components use the identical callback and
pages. The callback records timestamps and costs in refs; rendering the
report happens only on a button press. Repeat the same drag on iOS Release
and Android, preserving event counts, events/s, mean and p95 JS handler µs.
Both final comparisons retain native delivery and reduce callback cost: iOS 5.02×, Android 8.06×.

The iOS automation is `tests/native-features/scripts/pager-ios-benchmark.ts`.
It resets after an instant move to page 2, performs one second rightward drags
to page 1, waits for selection and idle, and records seven samples per component.
It requires fractional progress and at least 20 delivered events for each drag.

The base branch already exports Storage and useHeaderHeight in source but carried
stale root declarations. Their generated declarations are refreshed alongside
the pager exports so the existing native fixture still typechecks.

RAN: the iOS 27 iPhone 17 Pro Debug fixture build succeeded in 449.9s.
The pinned One source `88b9fd7a9995daa488a68f1cb7fc20a18306019a`
also built through `bun remote`: iOS Release reported `Build succeeded`
in 1666.5s; Android reported `BUILD SUCCESSFUL` in 11m 38s, 436 tasks.
The builder cleanup receipt says `released: true`. Binaries and build logs
are preserved in the Contrast worktree under `artifacts/one-ui-pager/`.

TESTED: the accepted paired library proof passed all nine checks on iOS and
Peach, from Contrast `d788eb176196b2e42dd144d2b758b9dc0add8f4e`
against the authenticated native app built from One `88b9fd7a9`.
Both named pager viewport comparisons measured 0.000% pixel difference.
The full frame includes differences outside that viewport. Report:
`artifacts/conformance-proof/one-ui-pager-strict-native/report/index.md`.
The case checks initial selection, animated and instant commands, resize,
orientation and disabled gestures. Exact numeric frame assertions use node's
strict assertion API because native's global expect accepts Detox matchers.

TESTED: the initial Peach orientation command failed: setPage(0) left
position:1. Its cached ScrollView handler kept the constructor axis after
props changed. The engine now reads the current orientation; the accepted
paired run exercises that command and passes.

RAN: both native fixtures render initial page 1 with the actual page visible.
iOS Release uses the standard iPhone 17 Pro, iOS 27.0, UDID
`C75DA2BC-721A-491D-A8C4-65943DA33F67`; Android uses Pixel 8, Android 17
API 37, `emulator-5554`. Runtime screenshots and measurements are stored
in the Contrast worktree under `artifacts/one-ui-pager/`.

TESTED: Android commands initially emitted selected:2 while native page 0
remained visible. ViewPager2 now receives its internal measure/layout pass after
commands. Removing selected page 3 initially jumped to page 0; reconciliation
now preserves the selection before adapter notification and clamps it to page 2.
Both failures were observed on the emulator before their fixes passed.

Run each benchmark separately through `bun heavy --exclusive
--admission-timeout-seconds 1200`; take that reservation only after the fixture
is ready. The iOS runner uses axe on PATH or an explicit AXE_PATH from
XcodeBuildMCP. The final fixture measures event rate and callback cost only between the
native dragging and settling states, while retaining settled final progress.
The first Android comparison included settling; those numbers are retained
as preliminary evidence, and the final comparison uses the drag interval.
Both runners assert visible page 2 before each drag, then
selected page 1, idle and fractional scroll delivery before recording a sample.

RAN: the migrated Contrast Debug binary built through `bun remote` on pro-128:
`Build succeeded` in 1487.4s. Pod install reported 107 pods. The app and logs
are preserved at `artifacts/one-ui-pager/Contrast-debug.app`,
`contrast-build.log`, `contrast-pods.log` and `contrast-cleanup.json` in the
Contrast worktree. Its ignored generated pods do not change the committed
pod ledger or OTA runtime. The migrated Develop screen is captured in
`artifacts/one-ui-pager/develop-native-chat/ios/chat-seeded.png` (1206×2622).
The capture printed `ios captured chat-seeded`, authenticated the seeded user,
opened the actual project through its picker and asserted the seeded assistant
message and composer. Its manifest records status `captured`. The screenshot
was inspected. Preview-page navigation also reached the native preview, whose
content reported an unavailable compile catalog on the isolated server.

RAN: the Android fixture rebuilt from One `f31e81d35`, with scroll-event
coalescing disabled, reported `BUILD SUCCESSFUL` in 7m 1s, 436 tasks. Its
cleanup receipt says `released: true`; `NativeFeatureTests-delivery.apk` is
installed on the emulator. The earlier clamp fixture passed all 16 geometry
and gesture checks, including removal to selected:2 with visible page 2.

TESTED: Android software keys are visible before the drag and hidden after it,
with selection 2 and idle. IME window visibility changes from 3 to 0 and
mInputShown from true to false. The exact assertions and screenshots are
`android-keyboard-proof.json`, `android-keyboard-checks-keyboard.png` and
`android-keyboard-after.png` under `artifacts/one-ui-pager/`.

RAN: iOS Release passed 15 edge checks: initial selection, animated first/last,
invalid and instant commands, resize, RTL, axis changes, vertical commands,
selected-page removal, restoring geometry, disabled gestures, commands while
disabled, reenabled gestures and margin changes. The exact check list is in
`artifacts/one-ui-pager/ios-edge-checks.json`; the settled frame is
`ios-pager-edges-before-keyboard.png`. Its production JavaScript now measures
the drag interval only, built from One `a64f4f8af`; the native binary remains
`88b9fd7a9`. The original bundle is preserved as `ios-original-main.jsbundle`.

RAN: iOS software-keyboard behavior remains not run. Device Hub, the iOS 27
successor to Simulator.app, was relaunched over SSH after its
`com.apple.dt.Devices` setting `alwaysSimulateHardwareKeyboard=false` read 0.
A fresh C75 boot also set ConnectHardwareKeyboard=false and broadcast
HardwareKeyboard.Connected NO. The field focused, but software keys did not
present within the 15-second assertion. This reproduces both before and after
Device Hub relaunch. Exact steps are in `ios-keyboard-check.json`; the Android
IME proof supplies keyboard visibility and drag-dismissal evidence.

TESTED: migrated Develop startup reached its JavaScript server, which rejected
better-fetch with a source-map composition error. A compiler probe found that
Babel automatically loaded the dependency's external map during class lowering,
producing nine sources where composition required one. The class transform now
sets inputSourceMap:false. The regression first failed with two external sources,
then passed with one local source and unchanged runtime value 7. Composing the
actual better-fetch class and async maps now succeeds with its single JavaScript
source. This upstream fix is `3293e0a1b`. The compiler rebuild passed
(`built @vxrn/compiler in 234ms`); its built dist, source and declarations
were copied into the local Contrast install without publishing.
TESTED: the next Develop startup selected op-sqlite's async web backend on
native. Four negative controls (iOS/Android, dev/build) reproduced that when
browser appeared before react-native in the package export map. The native
resolver now prioritizes explicit react-native exports and retains browser-only
package behavior. The complete resolver suite passed 108 tests and vxrn built
in 10455ms. Source and generated declarations are pushed at `e4bcdf584`; the
built dist, source and types are copied into Contrast's local vxrn consumer,
preserving its package manifest. The native Develop capture above now succeeds against both local prerequisite fixes.

RAN: the final drag-only fixture typecheck exited 0 with no type errors.

RAN: the short 120-second admission windows expired while draining existing
native builds and validation jobs, before any benchmark drag. Both fixtures are
now ready, and the final run allows one bounded 20-minute admission window per
platform. This changes gate scheduling only; the gesture and assertion timings
remain unchanged. No two benchmark reservations run together.

RAN: iOS Release completed all seven samples for each component. Median
delivery: One 45.6286 vs pager-view 45.0352 events/s; callback mean 0.9435 vs
4.7387 µs; p95 1.3330 vs 5.5829 µs. Both median counts are 55. All visible-page,
fractional progress, selected-page and idle assertions pass. Raw data:
`artifacts/one-ui-pager/ios-speed.json`. The exclusive claim released at exit.

## Upstream study

READ: react-native-pager-view 8.0.5's native spec, JS wrapper, iOS provider,
SwiftUI pager and scroll delegate, Android manager, adapter, nested host and
scroll event. These are the reference implementation, not a new paging model.

| upstream source | behavior carried into One |
| --- | --- |
| `src/PagerViewNativeComponent.ts` | props, three direct event payloads, three imperative commands, with One's fixed namespace and named ref type |
| `src/PagerView.tsx`, `src/utils.tsx` | direct children fill each page and remain native views; scrolling can be disabled independently of imperative navigation |
| Android `PagerViewViewManagerImpl.kt` | ViewPager2, custom child layout, deferred exact measure/layout after commands and child changes, orientation and overscroll mapping |
| Android `ViewPagerAdapter.kt` | RN owns the existing child views; native holders attach those children rather than reconstructing their React trees |
| iOS `PagerScrollDelegate.swift` | fractional position/offset, dragging/settling/idle transitions and final offset 0 before idle |
| iOS `PagerView.swift` | preserve and clamp selected page when children shrink |

The first Android command-layout failure rediscovered a safeguard already in
upstream `setCurrentItem`/`refreshViewChildrenLayout`. One carries that safeguard
now; it should have been present before the first device probe.

The specified iOS departure is structural: upstream hosts SwiftUI TabView in a
UIHostingController and intercepts its UICollectionView delegate. One owns a
paging UIScrollView directly, leaving paging physics to UIKit and avoiding the
hosting/collection paths identified by runtime comments 28, 29 and 58. Android
keeps the same ViewPager2 foundation. Its keyboard dismissal happens once when
native drag begins, instead of the upstream JS wrapper calling Keyboard.dismiss
on every scroll event. One passes the scroll callback directly. The benchmark
measures that callback-path cost; it does not claim a new native paging algorithm.

Callstack's MIT notice is retained in the repository and the One package license.

## Final Android proof

TESTED: native `378ef2755` adds upstream holder retention, incremental adapter
notifications, the zero-margin transformer fast path and native gesture handoff.
The arm64 fixture build printed `BUILD SUCCESSFUL in 8m 2s`, 370 tasks. Its
geometry/gesture checks and actual IME show/drag-dismiss/selected-page assertions
pass (`android-holders-edge-checks.json` and keyboard before/after dumps).
The IME probe waits for window visibility, rather than reading before it rises.

RAN: counterbalanced 7+7 drags on the Metal-backed Android emulator pass all
preconditions. One vs pager-view medians: 60.0134 vs 59.9550 events/s, 3.0803 vs
24.8167 µs mean callback, 4.5000 vs 37.0000 µs p95. This is 8.06× lower mean
cost at the same native delivery rate; the 0.10% rate difference is timing noise.
All samples are retained. Native frames agree with callback delivery. The
software-renderer diagnostic and sequential-order results do not establish a
component delivery loss or win; only the counterbalanced result is accepted.
Raw data and frame counts: `android-speed-counterbalanced.json` and its
`*-frames.txt` siblings. Both branches are ready for the approved landing.
