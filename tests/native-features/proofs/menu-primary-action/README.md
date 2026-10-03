# Menu primary action iOS 27 proof

RAN on pro-128 with Xcode 27.1 and an iPhone 16 running iOS 27.0.
`outcome.json` records 15 passing checks at suite source
`72abae0c650ad0dab6ef15f72278a52b408fd5d0`. The native build came from
`60ab9a064282440000b118a369d758148fcd5e53`; both revisions have the same
`packages/one/ios` tree,
`3794b6df15a39be9b557c7261992967def52af85`. After the intervening
`v2-beta` Vite merge, One's JS package was rebuilt and the suite was rerun
against that merged source using the unchanged native binary.

RAN again after the Android prop forwarding fix at `6bbe2d2ad` on the same
iPhone 16/iOS 27.0 simulator: `post-android-fix-outcome.json` records 15/15
checks passed. The native tree remains `3794b6df15a39be9b557c7261992967def52af85`;
the fix changes only `AndroidMenu.tsx` and its contract test. The contract test
failed before the fix because `primaryAction` reached the trigger View, then
passed after the callback was removed from forwarded View props.

Eight PNG and compressed AX pairs show the initial state, short tap, long-press
menu, disabled state before and after touches, re-enabled state, and an
ordinary Menu before and after selecting its item. The focused checks prove
that a short tap calls `primaryAction` without opening
the menu; a long press opens the native item without a second primary call;
selecting the item calls `onAction`; disabled Menu accepts neither gesture;
and re-enabling restores the primary action. It also proves an ordinary Menu
still opens on a short tap and sends the item through `onAction` without
calling the primary callback. `side-by-side.webp` arranges initial, tapped,
open, disabled, plain-open, and plain-selected states. The test records the
post-touch disabled screenshot rather than inferring its state from the
pre-touch image.

RAN: a broader `tabs-menu` run on the suite's required 393×852 iPhone 16
passed 51 checks, including ordinary Menu items, toggles, nested actions,
and palette selection, then stopped at its `palette-menu` pixel floor
(`1 < 200`). `tabs-menu-regression-outcome.json`, `tabs-menu-palette-open.png`,
and the matching AX capture preserve that result. The screenshot visibly
shows the native palette open, and AX contains Bold and Italic buttons;
the full `tabs-menu` suite is not claimed as passing.

RAN negative control: the exact same `tabs-menu` gate on clean `v2-beta`
`3b4dcc590` also passed 51 checks and stopped at `1 < 200` on the same iPhone
16/iOS 27.0 simulator. Its separately built app had matching built and
installed code-bearing dylib SHA-256
`a172bb5a6e0c3b84a6fffad67c5157e376f8db62c42422a739ddbd6505e19bf9`.
The visual gate source blob is identical on baseline and Menu branch
(`ec303c41705bbcb2071fd83388c54730c17555a5`). The baseline outcome,
build log, palette screenshot/AX, and machine-collected environment are saved
as `clean-v2-beta-*` here. The baseline screenshot shows the native palette
open; the calibrated pixel floor fails on iOS 27 in both runs. The palette
assertion was left unchanged.

`environment.json` was produced from Git, simctl, Xcode, and SHA-256 reads on
the build host. It records the iOS runtime, light appearance, en_US locale,
matching built/installed app debug-dylib and executable hashes, source trees,
and hashes of the uncompressed Xcode log and outcome. `xcodebuild.log.gz` ends
in `BUILD SUCCEEDED`; `generate-check.log.gz` ends in `verified` at the merged
source. The conformance command was:

```sh
bun tests/native-features/scripts/one-native-conformance.ts \
  --simulator-id 20A4D15A-8E8F-4D08-A8CC-1EBE7417552D \
  --bundle-id dev.vxrn.native.tests --suite menu-primary-action \
  --timeout 45000 \
  --app-path tests/native-features/build/derivedData/Build/Products/Debug-iphonesimulator/NativeFeatureTests.app \
  --js-location 127.0.0.1:8081 \
  --artifact-dir tests/native-features/build/menu-primary/proof4
```

This proof covers Menu's primary-action initializer on this iOS runtime.
Context-menu previews, a Picker embedded in menu content, and other iOS
versions remain unproven.
