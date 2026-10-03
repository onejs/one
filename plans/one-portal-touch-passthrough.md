# Native portal host touch handling

Owner: r54299 / one-tamagui-launch. Source branch: `v2-beta`.
Contrast delivery and full Fabric smoke owner: s6466.

An iOS portal host is a container for its children. A hit on empty host space
must pass through to the view below it. The host now delegates hit testing to
RCTViewComponentView and returns nil when that superclass returns the host
itself. Child hits and React Native's visibility, pointer-events, clipping,
and ordering behavior still come from the superclass. No JS API changes.

TESTED (relayed from s6464): the empty fullscreen OneNativePortalHostView
intercepted Back and Settings scroll in a Contrast Release build. Disabling
interaction on that view restored both with native drawing on and off.
INFERRED (s6466's four named Release smoke runs): One's Tamagui root host
causes the Build pager swipe failure; teleport root hosts pass the swipe but
fail design portals. Fullscreen `root` must support both uses together.

TESTED: a Release UIKit probe on a claimed standard iPhone 17 Pro, iOS 27,
compiled the hitTest method extracted from the actual source. Its baseline
UIView host intercepted the Back target. All 11 repaired cases passed:
empty host to Back and scroll; interactive portal child; populated host's
blank area; topmost child; hidden and disabled children; hidden, disabled and
alpha-zero host; child removal back to an empty host. Checks abort on failure
in Release. Evidence: `~/.team-machine/handoffs/one-tamagui-launch-evidence/`
(`portal-hit-tests.json` and the `portal-probe` workspace).
This is UIKit runtime evidence with a UIView superclass, not full Fabric
runtime proof. Source inspection of the installed RCTViewComponentView
confirms its default hitTest returns self for otherwise unclaimed in-bounds
points; its BOX_NONE mode uses the same self-to-nil policy. Android's host
manager already configures BOX_NONE, so no Android change is needed.

RAN: normal beta Release [37142277754](https://github.com/onejs/one/actions/runs/37142277754)
completed successfully for source `b92aafe9c`. Its full-CI and current-source
gates passed. Fresh npm tarballs of `one` and `vxrn` version
`2.0.0-beta.167.1` match eight relevant source files from that commit,
including `ios/OneNativePortalHostView.mm`. All 101 concrete export targets
are present. Content receipts: `plans/one-portal-beta167.1-content.json`.
The verified version was sent to s6466 for Contrast delivery.

TESTED (relayed from s6466): full Contrast Release OTA smoke on runtime 84
passed all 13 checks in [run 37145006219](https://github.com/sootbean/soot/actions/runs/37145006219),
using branch `87a81266ac` with `one@2.0.0-beta.167.1`. Real HID touches passed
Build paging (`buildPreviewPage`, `previewTabStepsRight`), design portal controls
(`designTabEnabled`, `coldDesignAboveTabBar`), and Settings opening, scrolling
and Back (`settingsOpensByTouch`, `settingsScrolls`, `settingsBackReturns`).
Runtime-83 builds with One's root host failed the swipe, the negative control.

RAN (relayed from s6466): another delivery owner had already landed
`one@2.0.0-beta.168.1` and runtime 84 at `211a25e0aa`. Fresh 168.1 tarball
`OneNativePortalHostView.mm`, `hooks.tsx`, and `Route.tsx` were byte-identical to
`b92aafe9c`. The duplicate 167.1 pin was dropped; only the permanent Settings
smoke checks landed at `371923e8ee`. TestFlight was re-enabled. Its uploaded
runtime-84 build number remains with the delivery owner and is not established
by the smoke receipt. The source regression has full downstream runtime proof.
