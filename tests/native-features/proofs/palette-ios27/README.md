# SwiftUI palette calibration on iOS 27

RAN on an iPhone 16, iOS 27.0, Xcode 27.1. `PaletteOracle.swift` builds a standalone SwiftUI app with the same Menu, palette ControlGroup, plain button style, fixed menu order, and white panel as the One fixture. It imports no One code. The built and installed binary hashes agree in `environment.json`.

RAN: the reference Bold crop contains 7,277 pixels at RGB 254 and 686 dark pixels. One's capture at f2369452b contains the same dominant gray and 686 dark pixels. Both score 1 under the former 247..251 card band. The clean v2-beta 3b4dcc590 capture in `../menu-primary-action` also scored 1 before the transparent-tabs change.

TESTED: `bun tests/native-features/proofs/palette-ios27/verify.ts` accepts both open palettes at 686, rejects both closed menus at 0, and proves the crop changed by 822 native pixels and 1,092 One pixels. Applying the One anchor to all four captures accepts only the two open palettes. The floor remains 200 and the ink band remains below 60; the card band is 252..254 and excludes plain white 255.

RAN: the same SwiftUI reference over gray 245 instead of the fixture's white panel produces gray 251 (`gray-background-measure.json`). INFERRED from that controlled backdrop change: the palette material depends on its backdrop, so a range calibrated against another backdrop cannot grade this fixture. The calibrated white-panel reference matches One without a rendering change. The earlier 70-capture corpus was not rerun; the declaration records these four captures.

The native oracle uses a scene manifest with `UIApplicationSupportsMultipleScenes: false`, an empty `UISceneConfigurations` dictionary, and bundle ID `dev.one.palette.oracle`. Build with `xcrun --sdk iphonesimulator swiftc -sdk "$(xcrun --sdk iphonesimulator --show-sdk-path)" -target arm64-apple-ios27.0-simulator -parse-as-library PaletteOracle.swift -o <app>/PaletteOracle`, sign the app, then install and launch it on a claimed simulator. Open the menu and tap Bold with physical input. The AX anchor is saved beside each native capture. `measure.ts <png> <ax-json>` prints the histogram and anchored score.
