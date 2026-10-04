# Vendored native sources

## EdgeFade (`OneNativeEdgeFade`, `UI.EdgeFade`)

Vendored from `react-native-edge-fade@0.2.0` (MIT, Copyright (c) 2026 Giulio
Amato), owned in-tree under `OneNative*` names so the symbols never collide
with the upstream package if an app also links it.

What we took (mask + blur; slice 1 mask, slice 2 blur):

- ios/OneNativeEdgeFadeCurves.{h,mm} — preset tables + custom parsing
  (overlay `LocationsForCurve` and blur `PresenceAt` dropped; the component
  view inlines its own presence sampling for the blur mask)
- ios/OneNativeEdgeFadeMaskLayer.{h,mm} — whole file
- ios/OneNativeEdgeFadeComponentView.{h,mm} — mask wiring + frost veil;
  overlay layers and bench macros dropped. Its blur backend is the variable
  blur below, not upstream's 3-level UIVisualEffectView stack (deleted along
  with its windowed mask layer and saturation compensation)
- android/.../OneNativeEdgeFadeCurves.kt — whole object
- android/.../OneNativeEdgeFadeShader.kt — AGSL + fallback trimmed to
  mask-only (overlay uniforms/branches deleted, not stubbed)
- android/.../OneNativeEdgeFadeView.kt — mask render + veil + clip + scroll
  sync; overlay, LAYERED pipeline, and lens deleted. Its blur mode is the
  react-native-blur progressive blur below (upstream's UNIFORM level stack,
  which only blurred the view's own children, is deleted)
- android/.../OneNativeEdgeFadeManager.kt — rewritten for our codegen spec
  following the file's dp/px + invalidate pattern

Deliberately NOT carried: overlay strip rendering (RN core
`backgroundImage` gradients paint it in `src/effects/EdgeFade.native.tsx`
with identical stacked semantics), the Reanimated variant, the web
implementation, and the lens mode.

One divergences from upstream, all tightening:

- Frost grades (`frostSaturation`/`frostLift`) are gone: both platforms
  render a plain blur of the backdrop, matching react-native-blur.
- The frost veil is global-color-only on both platforms (matching upstream
  behavior); per-edge color in blur mode warns in JS.
- The veil color crosses the spec as Int32 0xAARRGGBB resolved in JS (0 =
  no veil), so the main codegen emitter needs no color support.

The JS side (`src/effects/`) is a fresh implementation of the same prop
surface, not a copy.

Upstream license (MIT):

```
MIT License

Copyright (c) 2026 Giulio Amato
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Blur (`OneNativeVariableBlurView`, `OneNativeBlurEffectView`, `OneNativeBackdropCapture`)

Vendored from `@sbaiahmed1/react-native-blur@6.0.2` (MIT, Copyright (c) 2025
Ahmed Sbai). Android capture technique from QmBlurView 1.3.0, the library's
Android blur engine (MIT, Copyright (c) 2025-2026 Donny Yale).

What we took:

- ios/OneNativeVariableBlurView.swift — `ios/Views/VariableBlurView.swift`:
  the private `CAFilter` `variableBlur` on the effect view's backdrop, overlay
  hiding, foreground reapply, and window scale sync. The mask is injected by
  `OneNativeEdgeFadeComponentView` (built from the fade curve and
  `frostProgression`, eased with upstream's cubic) in place of upstream's
  direction/startOffset gradients and fallback masks. This is EdgeFade's iOS blur mode: one strip per edge,
  the radius growing from sharp to `blurRadius` across the band.
- ios/OneNativeBlurEffectView.swift — `ios/Views/BlurEffectView.swift`: the
  intensity animator that rebuilds itself on window entry, foreground, and
  redraw, plus the 3-frame stabilization. The Detox on/off branch is dropped.
  `OneNativeBlurComponentView` (UI.Blur) hosts it.
- android/.../OneNativeEdgeFadeView.kt blur mode —
  `ReactNativeProgressiveBlurView.kt`'s structure: one Gaussian of the
  backdrop per edge, composited through a DST_IN mask. The mask follows the
  EdgeFade curve and `frostProgression` instead of upstream's fixed ramp.
- android/.../OneNativeBackdropCapture.kt — QmBlurView `BaseBlurView`'s
  capture (software rasterization of the capture root into a downsampled
  bitmap on every window pre-draw, effect views skipping themselves on a
  software canvas) and the library's capture-root choice (nearest Screen,
  else React root). EdgeFade blur mode and UI.Blur blur it with the platform
  `RenderEffect`.

One divergences from upstream:

- Android blurs with `RenderEffect` (API 31+), not QmBlurView's JNI box blur,
  so there is no native library or jitpack dependency.
- The Android capture draws only what renders behind the blur view (the
  siblings before each ancestor on the path from the root), matching iOS
  backdrop semantics; upstream rasterizes the whole root, which also blurs
  views stacked above into a halo.
- Not carried: vibrancy, liquid glass, `BlurSwitch`, the web backends, and
  the reduced-transparency fallback color (no public One prop for it yet).

Upstream licenses (MIT):

```
MIT License

Copyright (c) 2025 Ahmed Sbai
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

```
MIT License

Copyright (c) 2025-2026 Donny Yale
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
