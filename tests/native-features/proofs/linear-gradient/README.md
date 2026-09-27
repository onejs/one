# iOS 27 SwiftUI LinearGradient proof

`outcome.json` records 14 passing `linear-gradient` checks at source
`42c02938b6986aa10627bc6b5e1044982928a8f0`. The seven PNGs and matching
compressed accessibility trees capture initial, reversed, single-color,
horizontal-point, alpha, three-color, and empty-color states. The unlabeled
gradient is decorative; the labeled gradient remains accessible.
`linear-gradient-pixels.json` records the color samples used by the runner.
`react-native-vs-swiftui.webp` compares the two rendering paths.

`environment.json` records the iPhone 17 Pro / iOS 27.0 simulator, Xcode 27.1,
and the app debug dylib hash observed for the run. `generate-check.log.gz` records
the SDK 27 generation check. These files were copied without changing their
recorded source revision from the original ignored
`tests/native-features/build/linear-gradient-final-14-proof` directory.

The suite proves the listed colors, points, alpha, transparent empty input,
and accessibility behavior on that runtime. It does not prove every gradient
direction or color interpolation against React Native's renderer.

**INFERRED after the `v2-beta` sync:** the current generated Swift source adds
only the shared `listRow` style refresh in `configureStyle` compared with the
proof revision. The gradient constructor, color/point conversion, rendering,
and accessibility code are unchanged. SDK 27 generation and TypeScript checks
passed on the merged tree; the runtime captures remain attributed to their
recorded source revision.
