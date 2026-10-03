# Menu Picker iOS 27 proof

RAN on studio-64 with Xcode 27.0 and an iPhone 17 Pro running iOS 27.0.
`outcome.json` records 49 passing checks; `conformance.log` is the run's
output. The native build is `776768955` on `menu-picker-land` (the squash of
`one-native-menu-picker` onto v2-beta's UIKit context-menu builder), with
`packages/one/ios` tree `b2007d191cbe58e1c2616ee743c98c014fde0273`; the
fixture and suite changes that followed are JavaScript only. `environment.json`
records the SHA-256 of the built and installed app binaries. `xcodebuild.log.gz`
ends in `BUILD SUCCEEDED`; `generate-check.log.gz` ends in `verified`.

Nate approved the `picker` item shape as public API.

## Menu

The first half drives `One.iOS.Menu`: the trigger opens SwiftUI's menu, the
Size row opens the native options submenu, and choosing Large reaches React
through `onPickerChange`. With rejection on, choosing Automatic is reported
(`Requested: automatic`) but React keeps `large`, and the reopened submenu
still checks Large. Reset bumps `revision` and the submenu checks Small again.

## ContextMenu

The second half hosts the same items in `One.iOS.ContextMenu`. A long press
opens the UIKit context menu; Size is a `.singleSelection` submenu built from
the same model. It goes through the same four states: initial Small, accepted
Large, rejected Automatic with Large still checked, and reset Small. Each
selection reaches React once (`Picker events` counts 3 and 4) and never calls
`onAction` (`Other action: none`).

## Evidence

Each `menu-picker-*.png` has a compressed AX capture beside it.
`menu-picker-pixels.json` records the dark pixels in a 24-point square
before each option in eight open submenus: 123 (Menu) or 124 (ContextMenu)
beside the selected option and zero beside the other two. The gate requires
at least 80 for the selected option and at most 10 for the others, so a
checkmark on the wrong row fails. `side-by-side.webp`, left to right:
initial screen, Menu accepted Large, ContextMenu initial Small, ContextMenu
rejected (Large kept, Automatic requested), and ContextMenu reset Small.

Android rejects Picker items before its popup opens.
`android-contract-red.txt` is the earlier run before that guard: two
failures, because `onPickerChange` reached the core View and a Picker node did
not throw. `android-contract-green.txt` is the current run of all three
Android Menu tests passing.

Other iOS versions and accessibility selection traits remain unproven.

## Rerun

Build the `NativeFeatureTests` scheme for the simulator, install it, start
the fixture server with `bun run dev --port 8081` in `tests/native-features`,
then:

```sh
bun tests/native-features/scripts/one-native-conformance.ts \
  --simulator-id <IPHONE_17_PRO_UDID> \
  --bundle-id dev.vxrn.native.tests --suite menu-picker \
  --timeout 45000 \
  --app-path tests/native-features/build/derivedData/Build/Products/Debug-iphonesimulator/NativeFeatureTests.app \
  --js-location 127.0.0.1:8081 \
  --artifact-dir <DIR_OUTSIDE_THE_APP>
```

Keep `--artifact-dir` outside `tests/native-features`: the dev server watches
that tree, and screenshots written there trigger a reload mid-run.
