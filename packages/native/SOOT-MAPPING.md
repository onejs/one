# Soot effects cutover mapping

How each Contrast Mobile (`templates/contrast-mobile`) effects usage maps to
`UI.*` from `@vxrn/native` at the zero-Expo cutover. This is a mapping note
for the migration owner; the migration itself is out of scope for the
native-effects track.

## Component map

| Soot site | Today | Cutover |
|---|---|---|
| `interface/effects/BlurView/*.tsx` | `expo-blur` `intensity` + `tint` | `UI.Blur intensity tint` (same props, same 21-tint union) |
| `interface/effects/GradientBlurView.tsx` | `MaskedView` + `BlurView` + `LinearGradient` | `UI.EdgeFade mode="blur"` (bottom/top, `size` from band height, `curve` from easing) |
| `interface/effects/BottomBlurBand.tsx` | `GradientBlurView` consumer | `UI.EdgeFade mode="blur" bottom={height}` |
| `interface/effects/MaskedFade/*.tsx` | `MaskedView` + `LinearGradient` | `UI.EdgeFade mode="mask"` (same edges/sizes), or RN core `backgroundImage` when the fade paints a solid overlay |
| `features/onboarding/Onboarding.tsx` mask | `MaskedView` + vertical gradient w/ holds | `UI.EdgeFade mode="mask" top bottom` with dp sizes from the locations |
| `interface/preview/PreviewStage.tsx` mask | `MaskedView` + horizontal gradient | `UI.EdgeFade mode="mask" left right` |
| `interface/header/PageHeader.tsx` | `GradientBlurView` consumer | `UI.EdgeFade mode="blur" top` |
| `interface/preview/PipChrome.tsx` badge | `BlurView tint="systemChromeMaterial"` | `UI.Blur` (same props) |
| any other `MaskedView` | arbitrary `maskElement` | `UI.Mask maskElement` (same API); gradient-only masks prefer `UI.EdgeFade` |

## Import removals

At cutover these imports delete with no replacement package:

- `expo-blur` → `UI.Blur` / `UI.EdgeFade`
- `@react-native-masked-view/masked-view` → `UI.EdgeFade` (gradient sites) / `UI.Mask` (arbitrary sites)
- `expo-linear-gradient` → RN core `backgroundImage` gradients (both platforms, no package)

## Behavior notes

- `UI.Blur` intensity is expo units (0-100, default 50); tint union is the
  full expo set. On Android it additionally renders a real backdrop Gaussian
  (expo's default path paints the scrim only), so Android gains parity with
  iOS rather than just matching expo.
- `UI.EdgeFade` blur `curve` reshapes the sharp→frost profile directly;
  Soot's easing lambdas map to `cubicBezier` or `stops` curves.
- `UI.Mask` masks live on both platforms (iOS `maskView`, Android per-frame
  composite); animated mask content tracks.

## Nothing to delete in this repo

The "delete replaced One implementations" step audited `packages/{one,vxrn,
native}/src` for `BlurView | ProgressiveBlur | EdgeFade | MaskedView`: the
only hits are this track's own new files. The `expo-blur` / `masked-view` /
`expo-linear-gradient` entries in `vxrn/src/patches/builtInDepPatches.ts`
are userland compat shims for apps still importing those packages, not One
implementations, and stay until the ecosystem moves.
