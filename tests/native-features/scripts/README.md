# One Native Conformance Runner

Runs a named One Native fixture against an installed simulator app. Each run stops and launches the named app. `--suite` selects `tabs-menu` (default), `pickers`, `forms`, `sheets`, `leaves`, `dialogs`, `host`, or `containers`.

```bash
bun tests/native-features/scripts/one-native-conformance.ts \
  --simulator-id <SIMULATOR_UUID> \
  --bundle-id <BUNDLE_IDENTIFIER> \
  --suite tabs-menu \
  --artifact-dir /tmp/one-native-conformance \
  --timeout 15000
```

`--simulator-udid` is accepted as an alias. Unknown arguments and invalid values fail, including an unknown suite. A failed stop is accepted only when its error explicitly says that the named app is not running.

Before home navigation and native tab taps, the runner waits for stable bounds and dismisses any observed development warning overlay and asserts it is gone. The overlay can cover the target while its accessibility node remains present.

The runner uses `xcodebuildmcp simulator stop`, `launch-app`, `snapshot-ui`, `ui-automation tap`, `ui-automation swipe`, `ui-automation type-text`, and `xcrun simctl io … screenshot`. Screenshot failures fail the run.

`tabs-menu` asserts the loaded fixture before every condition, then covers initial menu state and layout, React Native state retention through external, reordered, and native tab selection, native selection rejection and acceptance, menu visibility and disabled/hidden attributes, nested and deep menu actions, controlled kept-open toggles, the exact `Mixed: true,true` transition, palette and kept-open action dismissal behavior, search-role tab selection, and two leave/reenter cycles with identical menu payloads. Home loaded is `nav-one-native`. Fixture loaded is the original tabs predicate: `One Native` plus `Selected:`, or an Application node with `Dismiss context menu`.

That fixture must be on an iPhone 16 size simulator. Native tabs expose no accessible child controls, so the runner verifies the visible tab bar is 393 by 852 and dismisses an observed development warning overlay and asserts it is gone before using the validated tab coordinates.

`pickers` launches the same named bundle, then opens `nav-one-native-controls`. Fixture loaded is an Application node plus the controls `Value:` / `Request:` labels and control ids, or a menu overlay whose background is hidden (`Dismiss context menu`) with the Alpha / Beta / Gamma rows required. Native TabGroup has no children, so segmented taps use observed TabGroup bounds in thirds with rounded integer coordinates. It covers segmented accept, reject (controlled beta restored), revision reset, and external selection; menu options and Gamma selection; wheel `Slider` `AXValue` 2 then the row above for beta (`AXValue` 1, bounds height 216); then inline mount on the same `Slider` height 216 model. It also selects dates through compact, graphical, and wheel presentations and chooses opaque black in ColorPicker. Calendar and color popup children are missing from the snapshot API, so those taps use calibrated geometry guarded by the observed calendar bounds or 393x852 device size, with exact resulting Date/hex values asserted. Date fixtures use September 2026 and English simulator settings. Returning to Picker after the color popup verifies identical options survive native host recycling and send a fresh callback.

`forms` covers Toggle acceptance/rejection, reset revision, and external updates against the native switch value; Stepper acceptance/rejection, reset, external updates, every increment through the upper bound, a no-op increment at the bound, and decrement; and Slider drag, external values, rejection, and reset. Switches use a 150 ms press because instantaneous CLI HID taps do not start native switch tracking. Stepper's disabled increment still reports enabled in this snapshot API, so the runner tests the boundary behavior directly.

`sheets` verifies RN button/input interaction, state retention across reopen and nested sheets, fraction and height detent changes, exact 393x300 Yoga layout for a 300-point sheet, programmatic dismissal, and the same drag with interactive dismissal blocked and allowed. It checks presentation state and dismissal callback counts, then leaves/reenters the route and verifies identical medium detents are restored after native host recycling. Hardware keyboard input is enabled in the test simulator; this does not test software keyboard avoidance.

`host` covers native composition. It asserts the measured height for one child (28), for three children mounted later (84), with 20-point spacing (124), and with a wrapping child label (107), all at a 361-point width, so a wrong measurement fails on the number rather than on a screenshot. It then taps each composed control kind: a Toggle (through a 150 ms press, since an instantaneous HID tap never starts switch tracking), a Button, and a Stepper whose native AXValue must follow React. A composed control that renders but never emits is the specific failure this suite exists to catch, because a composed child never gets a window and activates on publication instead. Horizontal hosts are asserted by child order rather than by height: width-greedy SwiftUI controls overflow a phone-width row, and SwiftUI then reports a much taller ideal height. Two leave/reenter cycles verify composition survives native host recycling.

`containers` covers the container components: a `Swift.Form` holding `Swift.Section`s, a `Swift.Host` composed inside a section, and the generated `Text` and `Label`. It asserts the two standalone leaves take the catalog's 24-point default height, that the form fills its Yoga box (484 points here), and that a Toggle two containers deep still emits and its native AXValue follows React. A section mounted later, a section prop change (the footer), and unmounting a section are each asserted through the published SwiftUI tree, since React Native never displays a composed child's view. Two leave/reenter cycles verify container recycling.

Run suites sequentially against one simulator. Keep app source unchanged during state-retention checks; Fast Refresh invalidates that evidence. If the loaded-state assertion shows a RedBox, fix the app/dev server before rerunning.

Artifacts are written to `--artifact-dir`: key rendered screenshots and outcome.json with passed checks, durations, and `suite`, and a screenshot plus accessibility snapshot when a condition times out.
