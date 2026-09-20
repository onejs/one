// vendored from react-native-edge-fade (MIT, Copyright (c) 2026 Giulio Amato),
// trimmed to mask + blur for OneNativeEdgeFade (overlay lives in RN core).
// see VENDORING.md.
#import "OneNativeEdgeFadeBlurMaskLayer.h"
#import "OneNativeEdgeFadeCurves.h"

#import <UIKit/UIKit.h>

// ─── Gradient construction ────────────────────────────────────────────────────

// Builds a DeviceGray curve-governed mask gradient (Android parity — see
// frostGradient in OneNativeEdgeFadeView.kt). Returns a retained CGGradientRef.
//
// 32 evenly-spaced positional stops along the band (inner t=0 → outer t=1):
//   u      = min(t / fp, 1)                       — compress the curve's
//                                                    presence envelope into
//                                                    the inner `fp` fraction
//                                                    of the band
//   P      = presenceAt(curve, u)                 — the fade curve's presence
//   v      = clamp((P − lo) / (hi − lo), 0, 1)     — this level's [lo,hi] slice
//   weight = curveShaped ? v : v·v·(3 − 2·v)       — raw slice for level 0 (the
//                                                    visible transition), a
//                                                    zero-slope smoothstep for
//                                                    the heavier levels (anti-
//                                                    banding — see header)
//
// Caller releases the returned gradient.
static const int kMaskStops = 32;

// Presence (1 − alpha) at normalized position u, lerped over pre-resolved
// curve arrays.
static inline CGFloat presenceAtResolved(const CGFloat *alphas, const CGFloat *stops,
                                         size_t count, CGFloat u)
{
  if (u <= 0.0) return 1.0 - alphas[0];
  if (u >= 1.0) return 1.0 - alphas[count - 1];
  for (size_t i = 1; i < count; i++) {
    if (u <= stops[i]) {
      const CGFloat span = stops[i] - stops[i - 1];
      const CGFloat f = span > 0.0 ? (u - stops[i - 1]) / span : 1.0;
      return 1.0 - (alphas[i - 1] + (alphas[i] - alphas[i - 1]) * f);
    }
  }
  return 1.0 - alphas[count - 1];
}

static CGGradientRef buildBlurMaskGradient(NSString *curve, CGFloat lo, CGFloat hi, CGFloat fp,
                                            BOOL curveShaped)
{
  const CGFloat *alphas = NULL; const CGFloat *curveStops = NULL; size_t count = 0;
  CGFloat *dynAlphas = NULL, *dynStops = NULL;
  OneNativeEdgeFadeResolveCurve(curve, &alphas, &curveStops, &count, &dynAlphas, &dynStops);

  const CGFloat span = fp > 0.0 ? fp : 1e-4;
  const CGFloat range = (hi - lo) != 0.0 ? (hi - lo) : 1e-4;

  CGColorSpaceRef space = CGColorSpaceCreateDeviceGray();
  CGFloat components[kMaskStops * 2];
  CGFloat stops[kMaskStops];
  for (int i = 0; i < kMaskStops; i++) {
    const CGFloat t = (CGFloat)i / (kMaskStops - 1);
    CGFloat u = t / span;
    if (u > 1.0) u = 1.0;
    const CGFloat p = presenceAtResolved(alphas, curveStops, count, u);
    CGFloat v = (p - lo) / range;
    if (v < 0.0) v = 0.0; else if (v > 1.0) v = 1.0;
    stops[i]              = t;
    components[i * 2]     = 1.0;
    // Level 0: raw slice (the visible transition). Heavy levels: zero-slope
    // smoothstep — see the header note on scroll banding.
    components[i * 2 + 1] = curveShaped ? v : v * v * (3.0 - 2.0 * v);
  }

  CGGradientRef g = CGGradientCreateWithColorComponents(space, components, stops, kMaskStops);
  CGColorSpaceRelease(space);
  if (dynAlphas) { free(dynAlphas); free(dynStops); }
  return g;
}

// ─── Layer ────────────────────────────────────────────────────────────────────

@implementation OneNativeEdgeFadeBlurMaskLayer {
  // Per-edge gradient cache — every level depends on the curve AND
  // frostProgression, so there is no curve-independent static preset.
  // Without this, drawInContext: would rebuild its CGGradientRef on every call.
  NSString     *_cachedCustomTop,    *_cachedCustomBottom,
               *_cachedCustomLeft,   *_cachedCustomRight;
  CGGradientRef _customGradTop,       _customGradBottom,
                _customGradLeft,      _customGradRight;
  // frostProgression the per-edge cache entries were built for. It can change
  // at runtime (all levels depend on it); a mismatch busts all four.
  CGFloat _cachedFrostProgression;
}

- (instancetype)init {
  self = [super init];
  self.needsDisplayOnBoundsChange = YES;
  // Full-slice default → the plain curve-shaped fade-in. The component view
  // overrides sliceLo/sliceHi per level.
  _sliceLo = 0.0;
  _sliceHi = 1.0;
  _frostProgression = 1.0;
  _curveShaped = YES;
  _cachedFrostProgression = -1.0;
  // Seed with the main screen for snapshot/offscreen environments; the owning
  // view updates this via _syncLayerScales whenever the window/trait changes.
  self.contentsScale = UIScreen.mainScreen.scale;
  return self;
}

- (void)dealloc {
  if (_customGradTop)    CGGradientRelease(_customGradTop);
  if (_customGradBottom) CGGradientRelease(_customGradBottom);
  if (_customGradLeft)   CGGradientRelease(_customGradLeft);
  if (_customGradRight)  CGGradientRelease(_customGradRight);
}

// Returns a gradient ref for the given curve, windowed to this layer's fixed
// (sliceLo, sliceHi) slice and its current frostProgression. Since every level
// resolves the curve, gradients are cached per-edge and rebuilt when that
// edge's curve string OR frostProgression changes (sliceLo/sliceHi are fixed
// for a given layer's lifetime).
- (CGGradientRef)gradientForCurve:(NSString *)curve
                       cachedCurve:(NSString * __strong *)cachedCurve
                        cachedGrad:(CGGradientRef *)cachedGrad {
  if (self.frostProgression != _cachedFrostProgression) {
    // frostProgression changed — every cached edge gradient is stale.
    if (_customGradTop)    { CGGradientRelease(_customGradTop);    _customGradTop = NULL; }
    if (_customGradBottom) { CGGradientRelease(_customGradBottom); _customGradBottom = NULL; }
    if (_customGradLeft)   { CGGradientRelease(_customGradLeft);   _customGradLeft = NULL; }
    if (_customGradRight)  { CGGradientRelease(_customGradRight);  _customGradRight = NULL; }
    _cachedCustomTop = _cachedCustomBottom = _cachedCustomLeft = _cachedCustomRight = nil;
    _cachedFrostProgression = self.frostProgression;
  }
  if (*cachedGrad == NULL || ![*cachedCurve isEqualToString:curve]) {
    if (*cachedGrad) CGGradientRelease(*cachedGrad);
    *cachedGrad  = buildBlurMaskGradient(curve, self.sliceLo, self.sliceHi,
                                         self.frostProgression, self.curveShaped);
    *cachedCurve = curve;
  }
  return *cachedGrad;
}

- (void)drawInContext:(CGContextRef)ctx {
  const CGFloat w = CGRectGetWidth(self.bounds);
  const CGFloat h = CGRectGetHeight(self.bounds);
  if (w <= 0 || h <= 0) return;

  // Start fully transparent — blur shows only where an edge ramp writes non-zero
  // alpha. Center stays at alpha=0 (sharp) with no action needed.
  CGContextClearRect(ctx, self.bounds);

  // Lighten blend: overlapping corners take MAX(presence_top, presence_left)
  // rather than multiplying, preventing double-application of the curve.
  CGContextSetBlendMode(ctx, kCGBlendModeLighten);

  CGGradientRef grad;

  if (self.fadeTop > 0) {
    grad = [self gradientForCurve:self.curveTop ?: @"smooth"
                       cachedCurve:&_cachedCustomTop
                        cachedGrad:&_customGradTop];
    CGContextSaveGState(ctx);
    CGContextClipToRect(ctx, CGRectMake(0, 0, w, self.fadeTop));
    // start = inner edge (low presence), end = outer edge (full presence).
    CGContextDrawLinearGradient(ctx, grad,
      CGPointMake(0, self.fadeTop), CGPointMake(0, 0),
      kCGGradientDrawsBeforeStartLocation | kCGGradientDrawsAfterEndLocation);
    CGContextRestoreGState(ctx);
  }
  if (self.fadeBottom > 0) {
    grad = [self gradientForCurve:self.curveBottom ?: @"smooth"
                       cachedCurve:&_cachedCustomBottom
                        cachedGrad:&_customGradBottom];
    CGContextSaveGState(ctx);
    CGContextClipToRect(ctx, CGRectMake(0, h - self.fadeBottom, w, self.fadeBottom));
    CGContextDrawLinearGradient(ctx, grad,
      CGPointMake(0, h - self.fadeBottom), CGPointMake(0, h),
      kCGGradientDrawsBeforeStartLocation | kCGGradientDrawsAfterEndLocation);
    CGContextRestoreGState(ctx);
  }
  if (self.fadeLeft > 0) {
    grad = [self gradientForCurve:self.curveLeft ?: @"smooth"
                       cachedCurve:&_cachedCustomLeft
                        cachedGrad:&_customGradLeft];
    CGContextSaveGState(ctx);
    CGContextClipToRect(ctx, CGRectMake(0, 0, self.fadeLeft, h));
    CGContextDrawLinearGradient(ctx, grad,
      CGPointMake(self.fadeLeft, 0), CGPointMake(0, 0),
      kCGGradientDrawsBeforeStartLocation | kCGGradientDrawsAfterEndLocation);
    CGContextRestoreGState(ctx);
  }
  if (self.fadeRight > 0) {
    grad = [self gradientForCurve:self.curveRight ?: @"smooth"
                       cachedCurve:&_cachedCustomRight
                        cachedGrad:&_customGradRight];
    CGContextSaveGState(ctx);
    CGContextClipToRect(ctx, CGRectMake(w - self.fadeRight, 0, self.fadeRight, h));
    CGContextDrawLinearGradient(ctx, grad,
      CGPointMake(w - self.fadeRight, 0), CGPointMake(w, 0),
      kCGGradientDrawsBeforeStartLocation | kCGGradientDrawsAfterEndLocation);
    CGContextRestoreGState(ctx);
  }
}

@end
