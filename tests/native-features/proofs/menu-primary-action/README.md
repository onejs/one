# Menu primary action iOS 27 proof

RAN on pro-128 with Xcode 27.1 and an iPhone 17 Pro running iOS 27.0.
`outcome.json` records 13 passing checks at suite source
`b58e96c4d8947d2fc4c2d7c7a8412920ba67b901`. The native build came from
`60ab9a064282440000b118a369d758148fcd5e53`; both revisions have the same
`packages/one/ios` tree,
`3794b6df15a39be9b557c7261992967def52af85`. After the intervening
`v2-beta` Vite merge, One's JS package was rebuilt and the suite was rerun
against that merged source using the unchanged native binary.

Six PNG and compressed AX pairs show the initial state, short tap, long-press
menu, disabled state before and after touches, and re-enabled state. The
focused checks prove that a short tap calls `primaryAction` without opening
the menu; a long press opens the native item without a second primary call;
selecting the item calls `onAction`; disabled Menu accepts neither gesture;
and re-enabling restores the primary action. `side-by-side.webp` arranges
initial, tapped, open, and disabled states. The test records the post-touch
disabled screenshot rather than inferring its state from the pre-touch image.

`environment.json` was produced from Git, simctl, Xcode, and SHA-256 reads on
the build host. It records the iOS runtime, light appearance, en_US locale,
matching built/installed app debug-dylib and executable hashes, source trees,
and hashes of the uncompressed Xcode log and outcome. `xcodebuild.log.gz` ends
in `BUILD SUCCEEDED`; `generate-check.log.gz` ends in `verified` at the merged
source. The conformance command was:

```sh
bun tests/native-features/scripts/one-native-conformance.ts \
  --simulator-id A9BF26C8-2214-4DC6-AA9E-877B19A49FE9 \
  --bundle-id dev.vxrn.native.tests --suite menu-primary-action \
  --timeout 45000 \
  --app-path tests/native-features/build/derivedData/Build/Products/Debug-iphonesimulator/NativeFeatureTests.app \
  --js-location 127.0.0.1:8081 \
  --artifact-dir tests/native-features/build/menu-primary/proof3
```

This proof covers Menu's primary-action initializer on this iOS runtime.
Context-menu previews, a Picker embedded in menu content, and other iOS
versions remain unproven.
