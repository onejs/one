# Menu Picker iOS 27 proposal proof

RAN on pro-128 with Xcode 27.1 and an iPhone 16 running iOS 27.0.
`outcome.json` records 26 passing checks. The suite source is
`ee2cbe2a61302ff206c1a731e2fada33d624ed71`; the native build source is
`1cbf6cb5b5d5b977f43add43c7c9c7124e9c6427`. Both have the same
`packages/one/ios` tree, `6fe09f5405e00b542455296e9386d69b24e1cf49`.
`environment.json` records matching SHA-256 values for the built and installed
code-bearing debug dylib and app executable. `xcodebuild.log.gz` ends in
`BUILD SUCCEEDED`; `generate-check.log.gz` ends in `verified`.

The nine PNG/compressed-AX pairs show the trigger, outer menu, options submenu,
accepted selection, rejected selection, and revision reset. The left-to-right
panels in `side-by-side.webp` are initial Small, accepted Large, rejected
Automatic with Large still selected, and reset Small. The labels are visible
in the screenshots; no title overlay was added. `menu-picker-pixels.json`
records the native checkmark samples: 123 dark pixels beside the selected
option and zero beside the other two options in each of four states. The gate
requires at least 80 selected and at most 10 unselected dark pixels.

The runtime checks prove a SwiftUI Picker row in Menu, a native options
submenu, action delivery to React, selection acceptance, rejection when React
keeps its previous prop, and external reset with `revision`. The chosen option
appears with SwiftUI's checkmark. Context-menu hosting, other iOS versions,
and accessibility selection traits remain unproven. The item shape is a new
public API proposal, so this branch awaits Nate's approval before v2-beta.

The shared Menu item type also reaches Android. `android-contract-red.txt`
records the focused real-flattener contract before the guard: two failures,
because `onPickerChange` reached the core View and a Picker node did not throw.
`android-contract-green.txt` records all three Android Menu tests passing after
the narrow guard: Android rejects Picker items before popup presentation and
never forwards `onPickerChange` to the trigger View. Android picker parity is
outside this proposal.

Conformance invocation from the suite source checkout:

```sh
bun tests/native-features/scripts/one-native-conformance.ts \
  --simulator-id 20A4D15A-8E8F-4D08-A8CC-1EBE7417552D \
  --bundle-id dev.vxrn.native.tests --suite menu-picker \
  --timeout 45000 \
  --app-path tests/native-features/build/derivedData/Build/Products/Debug-iphonesimulator/NativeFeatureTests.app \
  --js-location 127.0.0.1:8081 \
  --artifact-dir tests/native-features/build/menu-picker/proof2
```

The build command is in the tracked `xcodebuild.log.gz` output and uses the
`NativeFeatureTests` workspace/scheme, Debug simulator SDK, the simulator id
above, and three Xcode jobs. The environment hashes were read with
`git rev-parse`, `shasum -a 256` on the built and `simctl get_app_container`
app paths, `xcodebuild -version`, `simctl list devices/runtimes`, and
`simctl ui ... appearance`. English was observed in AX but not pinned as a
simulator locale prerequisite.
