# Vendored native sources

## EdgeFade (`OneNativeEdgeFade`, `UI.EdgeFade`)

Vendored from `react-native-edge-fade@0.2.0` (MIT, Copyright (c) 2026 Giulio
Amato), owned in-tree under `OneNative*` names so the symbols never collide
with the upstream package if an app also links it.

What we took (slice 1, mask path only):

- ios/OneNativeEdgeFadeCurves.{h,mm} — preset tables + custom parsing
  (overlay `LocationsForCurve` and blur `PresenceAt` dropped)
- ios/OneNativeEdgeFadeMaskLayer.{h,mm} — whole file
- ios/OneNativeEdgeFadeComponentView.{h,mm} — mask wiring + radius;
  overlay/blur/veil layers, bench macros, and color props dropped
- android/.../OneNativeEdgeFadeCurves.kt — whole object minus blur-only
  `presenceAt`
- android/.../OneNativeEdgeFadeShader.kt — AGSL + fallback trimmed to
  mask-only (overlay uniforms/branches deleted, not stubbed)
- android/.../OneNativeEdgeFadeView.kt — mask render + clip + scroll sync;
  overlay/blur/lens/vibrancy deleted
- android/.../OneNativeEdgeFadeManager.kt — rewritten for our codegen spec
  (Double props) following the file's dp/px + invalidate pattern

Deliberately NOT carried: overlay strip rendering (RN core
`backgroundImage` gradients paint it in `src/effects/EdgeFade.native.tsx`
with identical stacked semantics), the Reanimated variant, the web
implementation, and the lens mode.

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
