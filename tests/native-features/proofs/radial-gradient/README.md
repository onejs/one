# iOS 27 SwiftUI RadialGradient proof

`outcome.json` records 17 passing checks at suite revision
`c593ca7e2ebf8ee245e02066773ac19ce2d8616f`. Nine PNGs and matching
compressed accessibility trees show initial, reversed, moved-center, wider
end radius, wider start radius, single-color, alpha, three-color, and
empty-color states. `radial-gradient-pixels.json` records the sampled pixels
and native 280 × 150 point frame. `initial-reversed-moved.webp` shows the
first three states side by side. The labeled gradient is accessible; the
unlabeled one is decorative.

`environment.json` was captured on ci-64's iPhone 17 Pro / iOS 27.0
simulator with Xcode 27.1. It records the merged source, suite, and native
build revision `c593ca7e2ebf8ee245e02066773ac19ce2d8616f`, its
`packages/one/ios` tree hash, and matching hashes for the
built and installed app debug dylib. `xcodebuild.log.gz`, `js-build.log.gz`,
and `generate-check.log.gz` preserve the three build and generation gates.
The full JavaScript build used the workspace's `create-vxrn` declarations;
the quick `--skip-types` build did not transform native view configs and was
discarded before this passing run.

The proof covers the listed colors, center, radii, alpha, empty input, and
accessibility on this runtime. Explicit color stops, arbitrary SwiftUI
`Color` values, and other iOS versions remain unproven.
