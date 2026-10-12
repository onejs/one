// vendored from react-native-edge-fade (MIT, Copyright (c) 2026 Giulio Amato),
// trimmed to the mask path for OneNativeEdgeFade. see VENDORING.md.
#import "OneNativeEdgeFadeMaskLayer.h"
#import "OneNativeEdgeFadeCurves.h"

#import <UIKit/UIKit.h>

// ─── Gradient construction ────────────────────────────────────────────────────

// Builds a DeviceGray mask gradient. Returns a retained CGGradientRef; preset
// gradients live in the static cache below and must NOT be released by the
// caller. Custom-curve gradients are freshly allocated — caller releases.
static CGGradientRef buildMaskGradient(NSString *curve)
{
  const CGFloat *alphas; const CGFloat *stops; size_t count;
  CGFloat *dynAlphas, *dynStops;
  OneNativeEdgeFadeResolveCurve(curve, &alphas, &stops, &count, &dynAlphas, &dynStops);

  // Components are { gray, alpha } pairs. Gradient stops run inner (i=0) →
  // outer (i=count-1), matching the draw direction below, so indexing directly
  // by `i` makes mask alpha(t) = curve alpha(t): fully visible at the inner
  // edge, fully faded at the outer edge.
  CGColorSpaceRef space = CGColorSpaceCreateDeviceGray();
  CGFloat *components   = (CGFloat *)malloc(count * 2 * sizeof(CGFloat));
  for (size_t i = 0; i < count; i++) {
    components[i * 2]     = 1.0;
    components[i * 2 + 1] = alphas[i];
  }
  CGGradientRef g = CGGradientCreateWithColorComponents(space, components, stops, count);
  free(components);
  CGColorSpaceRelease(space);
  if (dynAlphas) { free(dynAlphas); free(dynStops); }
  return g;
}

// Static preset cache — one gradient per preset, built once per process.
static CGGradientRef maskGradientForPreset(NSString *curve)
{
  static CGGradientRef cache[6];
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    cache[0] = buildMaskGradient(@"smooth");
    cache[1] = buildMaskGradient(@"sharp");
    cache[2] = buildMaskGradient(@"gentle");
    cache[3] = buildMaskGradient(@"soft");
    cache[4] = buildMaskGradient(@"linear");
    cache[5] = buildMaskGradient(@"smoother");
  });
  if ([curve isEqualToString:@"sharp"])   return cache[1];
  if ([curve isEqualToString:@"gentle"])  return cache[2];
  if ([curve isEqualToString:@"soft"])    return cache[3];
  if ([curve isEqualToString:@"linear"])  return cache[4];
  if ([curve isEqualToString:@"smoother"]) return cache[5];
  return cache[0];
}

// ─── Layer ────────────────────────────────────────────────────────────────────

@implementation OneNativeEdgeFadeMaskLayer {
  // Per-edge cache for custom-curve gradients. Presets are process-wide static
  // (see maskGradientForPreset); without this, a custom curve would re-parse the
  // string and rebuild its CGGradientRef on every drawInContext: call instead of
  // only when the curve actually changes.
  NSString *_cachedCustomTop, *_cachedCustomBottom, *_cachedCustomLeft, *_cachedCustomRight;
  CGGradientRef _customGradTop, _customGradBottom, _customGradLeft, _customGradRight;
}

- (instancetype)init {
  self = [super init];
  self.needsDisplayOnBoundsChange = YES;
  // contentsScale is updated to traitCollection.displayScale by the owning view
  // in didMoveToWindow:/traitCollectionDidChange:. Seed with the main screen
  // for environments where the view never reaches a window (snapshot tests).
  self.contentsScale = UIScreen.mainScreen.scale;
  return self;
}

- (void)dealloc {
  if (_customGradTop)    CGGradientRelease(_customGradTop);
  if (_customGradBottom) CGGradientRelease(_customGradBottom);
  if (_customGradLeft)   CGGradientRelease(_customGradLeft);
  if (_customGradRight)  CGGradientRelease(_customGradRight);
}

// Returns a gradient ref for the given curve. Presets come from the static
// process-wide cache; custom curves are cached in the given edge slot and only
// rebuilt when that edge's curve string changes.
- (CGGradientRef)gradientForCurve:(NSString *)curve
                       cachedCurve:(NSString * __strong *)cachedCurve
                        cachedGrad:(CGGradientRef *)cachedGrad {
  if (!OneNativeEdgeFadeCurveIsCustom(curve)) return maskGradientForPreset(curve);
  if (![*cachedCurve isEqualToString:curve]) {
    if (*cachedGrad) CGGradientRelease(*cachedGrad);
    *cachedGrad = buildMaskGradient(curve);
    *cachedCurve = curve;
  }
  return *cachedGrad;
}

- (void)drawInContext:(CGContextRef)ctx {
  const CGFloat w = CGRectGetWidth(self.bounds);
  const CGFloat h = CGRectGetHeight(self.bounds);
  if (w <= 0 || h <= 0) return;

  CGContextSetFillColorWithColor(ctx, UIColor.whiteColor.CGColor);
  CGContextFillRect(ctx, self.bounds);
  CGContextSetBlendMode(ctx, kCGBlendModeDestinationIn);

  CGGradientRef grad;

  if (self.fadeTop > 0) {
    grad = [self gradientForCurve:self.curveTop ?: @"smooth"
                       cachedCurve:&_cachedCustomTop
                        cachedGrad:&_customGradTop];
    CGContextSaveGState(ctx);
    CGContextClipToRect(ctx, CGRectMake(0, 0, w, self.fadeTop));
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
