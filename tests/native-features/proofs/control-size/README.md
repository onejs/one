# iOS 27 SwiftUI controlSize proof

`outcome.json` records ten passing checks (five control-size checks) at suite revision
`6535b36e6b6e23697684ee95a0c43d8171993007`. Three PNGs and matching
compressed accessibility trees show `mini`, `extraLarge`, and restored `mini`
states. `measurements.json` records the native Button frames: both the Button
inside `Host controlSize` and the standalone Button with
`swiftStyle={{ controlSize }}` grow from 28 to 50.33 points and return to 28.
Both still dispatch taps to React. `mini-extra-large.webp` shows the first two
states side by side.

`environment.json` records ci-64's iPhone 17 Pro / iOS 27.0 simulator,
Xcode 27.1, source revision, native tree hash, and matching built/installed
debug dylib hashes. The native app was built at
`c593ca7e2ebf8ee245e02066773ac19ce2d8616f`; the exact same
`packages/one/ios` tree was present at suite revision. Its build log is
tracked at `../radial-gradient/xcodebuild.log.gz`.

This run proves `mini` and `extraLarge` sizing on bordered prominent Buttons
through Host inheritance and a direct modifier on this runtime. Other sizes,
control types, and iOS versions remain unproven.
