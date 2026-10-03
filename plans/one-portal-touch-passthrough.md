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

Next: publish the v2-beta fix and give s6466 the exact version. Their
`tm/ota-touch` branch at `437a16c3d7` adds Settings avatar, scroll and native
Back checks. They will update the whole One dependency set and runtime to 84,
build the Release simulator app, and run the real HID smoke for Build paging,
design board portal controls, Settings scroll and Back. Runtime 83 is the
negative control; its TestFlight workflow is held by the delivery owner until
runtime 84 includes this source. Full downstream proof remains open until
those checks pass. The source fix may ship as a beta while device tests run.
