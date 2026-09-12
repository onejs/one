# One Native Conformance Runner

Runs a named One Native fixture against an installed simulator app. Each run stops and launches the named app. `--suite` selects `tabs-menu` (default), `pickers`, `forms`, `sheets`, `leaves`, `dialogs`, `host`, `containers`, `popover`, `accessibility`, `media`, or `map`.

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

`containers` covers the container components: a `Swift.Form` holding `Swift.Section`s, a `Swift.Host` composed inside a section, and the generated `Text` and `Label`. It asserts the two standalone leaves take the catalog's 24-point default height, that the form fills its Yoga box (534 points here), and that a Toggle two containers deep still emits and its native AXValue follows React. A section mounted later, a section prop change (the footer), and unmounting a section are each asserted through the published SwiftUI tree, since React Native never displays a composed child's view. It also covers `Swift.Slot`: a React Native row inside a section and a second one inside the nested host, each asserted by taking a tap, which is the only evidence that touches reach React Native through the SwiftUI tree that displays it. Two leave/reenter cycles verify container recycling.

`popover` covers `Swift.Popover`, which is a composed trigger and a presented React Native subtree at once. It asserts the trigger lays out inline and reports the height SwiftUI measured, that React can present the body and that the presented subtree takes a tap and can dismiss itself from inside, that the composed SwiftUI trigger presents it, and that a tap outside reaches React through the controlled protocol: the proof is that React can present it again afterwards, which a lost dismissal event would make a no-op. A second popover composed inside a `Swift.Section` covers a popover as a container's child and the default compact adaptation, which is a sheet on an iPhone. Two leave/reenter cycles verify the popover survives native host recycling while it presents.

`media` covers the two controls that only exist because the generator reads SwiftUI's overlay modules: `Swift.VideoPlayer` from `_AVKit_SwiftUI` and `Swift.QuickLook` from `_QuickLook_SwiftUI`. The fixture writes a six second clip and a text file into the cache directory and reads their sizes back, so the byte counts prove both files reached disk before either control was handed a `file://` url. It asserts the player takes the Yoga box exactly (373 by 220) and follows it to 320 and back, which is the whole point of the `fill` layout kind: a fill control reports no ideal height, so nothing but the React Native box can be deciding that size. Playback is read off AVKit's transport overlay, which the runner reveals from the top edge of the surface because the play button covers the middle: elapsed time stays at `0:00` without autoplay and has moved on a player mounted with autoplay on. A presented Quick Look takes the whole accessibility tree, so the fixture behind it is unreadable while it is up; presentation is asserted through the QuickLook overlay's own ids, including the text-item search button, which is QuickLook having resolved the url to a text preview rather than merely presenting. Dismissal is asserted back on the fixture, where the change count must reach 2.

`map` covers `Swift.Map` from the `_MapKit_SwiftUI` overlay module. Like the player it asserts the fill layout by number: 373 by 220, following the style to 320 and back. MapKit publishes each annotation as an accessibility element carrying the marker's title, so the markers React sent are readable without a screenshot; the runner asserts the two it sent are present and the third is not, which is what separates "the object array arrived" from "some annotation rendered", then adds the third and empties the array. Every pin has to sit inside the seeded camera's region, because MapKit publishes nothing for an annotation well outside it and a distant pin would read as a lost prop. The camera is asserted through `onRegionChange` rather than assumed: the fixture reports the centre MapKit settled on, rounded to two places, and re-centring to a second place must both change that centre and raise the region count.

Run suites sequentially against one simulator. Keep app source unchanged during state-retention checks; Fast Refresh invalidates that evidence. If the loaded-state assertion shows a RedBox, fix the app/dev server before rerunning.

Artifacts are written to `--artifact-dir`: key rendered screenshots and outcome.json with passed checks, durations, and `suite`, and a screenshot plus accessibility snapshot when a condition times out.

## Visual verification

The accessibility assertions above cannot see whether anything painted. A control that publishes a
correct accessibility tree with correct frames while rendering nothing passes all 386 of them. That
is a real failure mode: the same bug was found in `@expo/ui`'s segmented picker, which painted 0 of
116,028 pixels while its test asserted only that its container ids existed.

`visual-verification.ts` closes that. It grades declared crop regions of the screenshots the suites
already write. Run everything with one command:

```sh
bun scripts/one-native-conformance-all.ts --simulator-id <UUID> --bundle-id dev.one.native.tests \
  --artifact-dir /tmp/one-native-conformance
```

That runs the 12 suites into `<artifact-dir>/<suite>/`, then the visual pass against the artifact
root. The visual pass runs last and against the root rather than per suite because several checks
take their negative capture from another suite's directory.

Each check in `visual-declarations.ts` declares a crop region, a subject measurement over the
pixels in it, a floor, and a negative capture. Three properties are enforced rather than asserted
in prose:

- **The subject measurement is directional.** It reads the positive capture only. A symmetric diff
  between two captures can never discriminate them, so it cannot be the gate.
- **The negative capture must fail.** `--swap-test` feeds every check its own negative and requires
  the reading to fall below the floor. A check that passes on both captures is not a check.
- **Specificity is recorded, not assumed.** `--cross-sub` runs every check's measurement over all
  captures in the corpus and reports how many clear the floor. A check that clears on 20 of 70
  captures is a presence detector, and its name has to say so: `sheet-presentation-paints` clears on
  16 of 70 and is named for what it measures. Every other check clears on 1 to 4, and each extra
  match is a genuine instance of the subject.

Floors come from measured values with the null state recorded beside them, for example map markers:
positive pin-tint 3,718, floor 1,500, a pin-free map reads 356.

Gemini vision (`visual-gemini-oracle.ts`, `--oracle`) is advisory commentary only and never decides
pass or fail. It was measured returning the wrong verdict on `map-markers`' own negative capture one
run in three, and on a pin-free map it could be flipped to pass by changing only the fixture's
status text, which it read instead of the pixels. Anything it decides is a coin flip; use it to
author and explain checks, not to gate them.

When adding a check, do not tune a crop until only the positive passes. Verify it by erasing the
subject in place: fill the declared region with a realistic null-state colour and confirm the
reading falls below the floor. All 18 checks do.
