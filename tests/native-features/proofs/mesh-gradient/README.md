# MeshGradient iOS 27 proof

RAN on pro-128 with Xcode 27.1 and an iPhone 17 Pro simulator running iOS 27.0.
`outcome.json` records 15 passing checks at source and suite revision
`d09a20d482103da19ed93c304449f910e7ca5eb5`. The native build is from
`bbb4cc77d8444bfc43f5122f5d567c69b22425a1`; both commits have the
same `packages/one/ios` tree, `23fa637ab9613ae6a7b9a5c078dba63c1b8c3458`.
`environment.json` records those revisions, iOS runtime, Xcode, locale,
appearance, and matching SHA-256 hashes of the built and installed app debug
dylib and executable. `xcodebuild.log.gz` includes the full JS build, Pods
regeneration, and successful simulator build. `generate-check.log.gz`
preserves the generator verification.

Seven matching PNG and compressed AX pairs cover the 2×2 initial state,
recolored and warped vertices, an inset grid exposing the background,
unsmoothed and perceptual variants, and a 3×3 grid. The labeled mesh is
accessible and the unlabeled mesh decorative. `mesh-gradient-pixels.json`
records the native 280 × 180 point frame and samples. In particular,
the smoothing sample at (0.2, 0.8) changes from `[53,26,201]` to `[82,51,162]`,
while the perceptual center changes from `[128,127,64]` to `[162,172,134]`.
`side-by-side.webp` shows initial, warped, background, and 3×3 states.

The focused command was:

```sh
bun tests/native-features/scripts/one-native-conformance.ts \
  --simulator-id A9BF26C8-2214-4DC6-AA9E-877B19A49FE9 \
  --bundle-id dev.vxrn.native.tests --suite mesh-gradient \
  --timeout 45000 \
  --artifact-dir tests/native-features/build/mesh-gradient-final-proof
```

The proof covers this iOS runtime and the supported sRGB hex color bridge.
Bezier-point meshes, resolved-color inputs, and other iOS versions remain
unproven.
