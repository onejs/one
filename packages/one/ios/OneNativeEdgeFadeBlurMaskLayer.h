// vendored from react-native-edge-fade (MIT, Copyright (c) 2026 Giulio Amato),
// trimmed to mask + blur for OneNativeEdgeFade (overlay lives in RN core).
// see VENDORING.md.
#import <QuartzCore/QuartzCore.h>

NS_ASSUME_NONNULL_BEGIN

/// CALayer that draws a combined blur-presence mask for all four edges into a
/// single grayscale bitmap.
///
/// Uses `kCGBlendModeLighten` so overlapping corner regions take the MAX
/// presence value rather than multiplying (which would over-darken corners and
/// hide blur exactly where both edges contribute). Result is used as the mask
/// of a `UIVisualEffectView` so alpha = blur presence: 0 → sharp, 1 → full blur.
///
/// Curve-governed progression (parity with the Android pipeline): along the
/// band (inner t=0 → outer t=1), `u = min(t/frostProgression, 1)` compresses
/// the curve's presence envelope into the inner `frostProgression` fraction of
/// the band; `P = presenceAt(curve, u)`; this level's slice is
/// `v = clamp((P − sliceLo)/(sliceHi − sliceLo), 0, 1)`. Three layers with
/// slices {[0,0.35], [0.35,0.65], [0.65,1]} back a set of increasing-radius
/// blur views: each heavier level fades in further along the curve's own
/// envelope, so the perceived radius grows toward the edge following the
/// curve's shape rather than a fixed geometric ramp. See
/// OneNativeEdgeFadeComponentView.mm.
@interface OneNativeEdgeFadeBlurMaskLayer : CALayer

@property CGFloat fadeTop, fadeBottom, fadeLeft, fadeRight;
@property (nonatomic, copy, nullable) NSString *curveTop, *curveBottom, *curveLeft, *curveRight;

/// This level's slice of the curve's presence envelope:
/// `weight(t) = shape(clamp((presenceAt(curve, min(t/frostProgression,1)) − sliceLo)/(sliceHi − sliceLo), 0, 1))`.
/// Fixed per layer instance (level 0 = [0, 0.35], etc).
@property CGFloat sliceLo, sliceHi;

/// Fraction of the band (inner→outer) over which the curve's presence
/// envelope completes; positions beyond it clamp to the curve's outer value.
/// Default 1.0 (envelope spans the full band).
@property CGFloat frostProgression;

/// Ramp shaping. YES (default) uses the raw slice weight `v` — used by level 0,
/// the visible sharp→frost transition, so editing the curve reshapes it
/// directly. NO applies a zero-slope smoothstep to `v` — used by the heavier
/// levels, whose fade-ins are internal cross-fades between two blur radii: a
/// non-zero-slope entry draws a visible onset line ("band") on scrolling
/// content.
@property BOOL curveShaped;

@end

NS_ASSUME_NONNULL_END
