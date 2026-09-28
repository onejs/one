# AngularGradient iOS 27 proof

RAN on pro-128 with Xcode 27.1, an iPhone 17 Pro simulator running iOS 27.0,
and source revision `a549c31987e078e76b4a42ee651d48c6d2c52930`.
`outcome.json` records 16 passing checks. Eight matching `angular-gradient-*.png`
and `angular-gradient-*.ax.json.gz` pairs show the initial state, a half-turn
rotation, moved center, reversed colors, three colors, one color, alpha, and
empty colors. `angular-gradient-pixels.json` preserves six off-axis RGB samples
per state and the native 280 × 150 point frame. `side-by-side.webp` juxtaposes
the first four states.

`environment.json` was generated from `git`, `xcodebuild`, `simctl`, and SHA-256
hashes after the run. Its `nativeSourceTree` is the tree at the recorded source
revision, and its built and installed `NativeFeatureTests.debug.dylib` hashes
match. `xcodebuild.log.gz` ends in `BUILD SUCCEEDED`; `suite.log.gz` contains the
final run; `generate-check.log.gz` ends with 287 mapped symbols, 266 generated
files, and `verified`. The app was built after `bun install --frozen-lockfile`,
`bun run build`, `one prebuild`, and `pod install` in the same worktree. The
focused run:

```sh
ONE_NATIVE_BUNDLER=rolldown bun run dev --host 127.0.0.1 --port 8081
bun tests/native-features/scripts/one-native-conformance.ts \
  --simulator-id A9BF26C8-2214-4DC6-AA9E-877B19A49FE9 \
  --bundle-id dev.vxrn.native.tests --suite angular-gradient \
  --timeout 45000 \
  --artifact-dir tests/native-features/build/angular-gradient-proof
```

The proof covers the supported full-circle initializer and sRGB hex bridge on
this device and OS. The partial-arc initializer, explicit stops, arbitrary
SwiftUI `Color` values, and other iOS versions remain unproven.
