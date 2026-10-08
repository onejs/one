# Client navigation scroll timing

2026-10-07 assignment: "fix the cause so scroll-to-top happens only once the new route has rendered."

RAN: headless Chrome on contrast.dev, scrolled to the footer, clicked the Docs Link. The first scrollTo(0, 0) ran with the home DOM still mounted and location.pathname still `/`, from scrollY 9126. Docs appeared about 57 ms later. A second scrollTo ran after the DOM changed.

RAN: the same suspended-page probe with the exact router.ts at cb6a85d86a390's parent retains scrollY 1200 until the destination commits. With router.ts at cb6a85d86a390 it resets to 0 while the source DOM remains, then resets again after commit. The current router reproduces that result. Only router.ts changed between the historical probes; the current ScrollBehavior and screen implementation were held constant.

INFERRED from those probes and the diff: cb6a85d86a390 (2026-09-25) reintroduced optimistic root-state publication for push/navigate inside startTransition. React state updates defer, while the existing imperative ScrollBehavior subscriber executes immediately. A transition cannot defer window.scrollTo. The previous commit only published optimistically for replace.

The fix queues scroll work from root notifications and consumes it in a layout effect inside the focused leaf screen. The marker commits with page content and waits through suspension. The route's contextual href prevents another screen consuming it, and repeated notifications for the handled location cannot reset it twice. Existing hash, group and scroll:false handling use the same commit point. Restoration reads the destination pathname explicitly because the linking listener can update the URL later.

RAN: moving restoration to commit exposed the browser subsequently overwriting One's back restoration (1200 to 0 with no additional scrollTo call). Restoration retains its existing deferred callback, now scheduled only after the destination commits. This preserves browser restoration on reload while placing One's back restoration after the browser's popstate task. The browser test includes back navigation.

RAN validation:

- Full `bun run --cwd packages/one build`, including declaration emit, passes.
- `bun run --cwd packages/one test src/views/ScrollBehavior.test.tsx`: eight tests pass.
- `TEST_ONLY=dev DEV_SERVER_URL=http://localhost:4317 PLAYWRIGHT_CHROMIUM_CHANNEL=chrome bun run vitest --run tests/scroll-commit.test.ts --retry=0` in tests/test-headless-web: two tests pass. It holds a real destination component on a controlled promise, asserts the source stays at 1200 with zero scroll calls, then asserts a single reset with the destination DOM present and back restoration to 1200. The second test checks hash scrolling to a destination heading.

Cost: one null marker per mounted leaf screen, one focus/context subscription and a layout effect. Scroll checks are constant time per committed leaf. The reset uses no timer, observer or polling. The existing restoration timer remains. Existing scroll-group lookup cost remains unchanged.

The public deployment has not changed yet. The beta-branch canary supplies the package for downstream installation. Parent m22514 owns normal CI follow-up; this lane verifies the requested canary tarball before finishing.
