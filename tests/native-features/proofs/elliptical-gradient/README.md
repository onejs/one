# EllipticalGradient iOS 27 proof

RAN on pro-128 with Xcode 27.1, an iPhone 17 Pro simulator running iOS 27.0,
and source revision `1b24f83d8e491bb77a3061651b22d25e9bfc35bd`.
`outcome.json` records 18 passing checks. Nine matching PNG and compressed AX
pairs cover the initial state, reversed colors, moved center, wider end and
start radius fractions, one color, alpha, three colors, and empty colors.
`elliptical-gradient-pixels.json` records the native 280 × 150 point frame
and RGB samples. The matched normalized horizontal and vertical quarter-radius
samples and distinct equal-distance physical horizontal sample demonstrate
the elliptical contour. `side-by-side.webp` shows initial, moved, wide, and
inner states.

`environment.json` was generated from `git`, `xcodebuild`, `simctl`, and SHA-256
hashes after the run. Its `nativeSourceTree` is the tree at the recorded source
revision, and the built and installed `NativeFeatureTests.debug.dylib` hashes
match. `xcodebuild.log.gz` ends in `BUILD SUCCEEDED`; `suite.log.gz` contains
the final run; `generate-check.log.gz` preserves the generator verification.
The app was built after frozen dependency install, full JS build, prebuild,
and CocoaPods install in the same worktree. The focused suite was run with:

```sh
bun tests/native-features/scripts/one-native-conformance.ts \
  --simulator-id A9BF26C8-2214-4DC6-AA9E-877B19A49FE9 \
  --bundle-id dev.vxrn.native.tests --suite elliptical-gradient \
  --timeout 45000 \
  --artifact-dir tests/native-features/build/elliptical-gradient-proof
```

The proof covers the supported fraction initializer and sRGB hex bridge on
this device and OS. Explicit stops, arbitrary SwiftUI `Color` values, and
other iOS versions remain unproven.
