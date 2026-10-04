// vendored from react-native-edge-fade (MIT, Copyright (c) 2026 Giulio Amato),
// trimmed to mask + blur for OneNativeEdgeFade (overlay lives in RN core).
// the blur backend is @sbaiahmed1/react-native-blur's variable blur
// (OneNativeVariableBlurView). see VENDORING.md.
#import "OneNativeEdgeFadeComponentView.h"
#import "One-Swift.h"
#import "OneNativeEdgeFadeCurves.h"
#import "OneNativeEdgeFadeMaskLayer.h"

#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/Props.h>
#import <react/renderer/components/OneNativeSpec/RCTComponentViewHelpers.h>
#import "RCTFabricComponentsPlugins.h"

using namespace facebook::react;

// `invalidateLayer` exists on RCTViewComponentView (it runs the border and
// clipping pipeline, which unconditionally clears the layer mask) but is not
// in the public header on 0.87, so declare it to override visibly.
@interface RCTViewComponentView (OneNativeEdgeFadeInvalidation)
- (void)invalidateLayer;
@end

// ─── Render mode enum ────────────────────────────────────────────────────────

typedef NS_ENUM(NSInteger, OneNativeEdgeFadeRenderMode) {
  OneNativeEdgeFadeModeMask, // default — alpha mask on self.layer
  OneNativeEdgeFadeModeBlur, // per-edge variable blur strips, optional veil
};

// ─── Progressive-blur model (blur mode) ───────────────────────────────────────
//
// Each active edge gets one OneNativeVariableBlurView clipped to its fade
// strip. The view's backdrop runs Core Animation's variable blur, whose mask
// image scales the blur RADIUS per pixel, so the blur genuinely grows from
// sharp at the strip's inner edge to `blurRadius` at the outer edge (Apple
// Music's progressive blur) instead of cross-fading fixed-radius blurs.
//
// The mask follows the fade curve (Android parity): along the band (inner
// t=0 → outer t=1), `u = min(t/frostProgression, 1)` compresses the curve's
// presence envelope into the inner `frostProgression` fraction of the band,
// `P = presenceAt(curve, u)`, and the mask alpha is `P³` (upstream's ease-in:
// a radius ramp reads heavier than the opacity ramp Android composites).
//
// ── Band clipping (cost) ──
// A backdrop blur's cost scales with the view's area, and the fade only ever
// occupies thin strips along the edges, so each edge's view covers just its
// strip. Views for an edge whose fade is 0 are `hidden`: CoreAnimation does
// not composite a hidden layer, so it never runs a backdrop pass. The radius
// is 0 at a strip's inner edge, so the strip boundary needs no sampling pad.
//
// ── Corners (tradeoff) ──
// Where two edges' fades overlap (a corner) the later strip blurs the earlier
// one's output. The result is ~the stronger of the two contributions rather
// than an exact 2-D blend, which is visually indistinguishable in practice and
// accepted for the large area win.

// Edge indices into the per-edge arrays below.
typedef NS_ENUM(NSInteger, OneNativeEdgeFadeEdge) {
  OneNativeEdgeFadeEdgeTop = 0,
  OneNativeEdgeFadeEdgeBottom = 1,
  OneNativeEdgeFadeEdgeLeft = 2,
  OneNativeEdgeFadeEdgeRight = 3,
};
static const NSInteger kEdgeFadeEdgeCount = 4;

// frostProgression clamp bounds (JS clamps too; this guards direct prop use).
static const CGFloat kEdgeFadeFrostProgressionMin = 0.05;
static const CGFloat kEdgeFadeFrostProgressionMax = 1.0;

// Samples along the band in a mask image. The filter stretches the image over
// the strip with linear filtering, so 256 samples are smooth at any fade size.
static const size_t kMaskSamples = 256;

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

// Variable-blur mask for one edge strip: a 1-pixel-thick RGBA image running
// along the band, alpha = eased curve presence (outer edge full radius, inner
// edge sharp). Row 0 is the strip's top, column 0 its left. Caller releases.
static CGImageRef createEdgeBlurMask(OneNativeEdgeFadeEdge edge, NSString *curve, CGFloat fp)
{
  const CGFloat *alphas = NULL; const CGFloat *curveStops = NULL; size_t count = 0;
  CGFloat *dynAlphas = NULL, *dynStops = NULL;
  OneNativeEdgeFadeResolveCurve(curve, &alphas, &curveStops, &count, &dynAlphas, &dynStops);

  const BOOL vertical = (edge == OneNativeEdgeFadeEdgeTop || edge == OneNativeEdgeFadeEdgeBottom);
  // top and left strips have their outer edge at index 0.
  const BOOL outerFirst = (edge == OneNativeEdgeFadeEdgeTop || edge == OneNativeEdgeFadeEdgeLeft);
  uint8_t pixels[kMaskSamples * 4] = {0};
  for (size_t i = 0; i < kMaskSamples; i++) {
    const CGFloat along = (CGFloat)i / (kMaskSamples - 1);
    const CGFloat t = outerFirst ? 1.0 - along : along;
    const CGFloat u = MIN(t / fp, 1.0);
    const CGFloat p = MIN(MAX(presenceAtResolved(alphas, curveStops, count, u), 0.0), 1.0);
    // upstream's ease-in cubic: the mask scales the blur RADIUS, and even a
    // small radius fraction smears text, so presence cubed keeps the inner
    // part of the band readable before rising into full blur.
    pixels[i * 4 + 3] = (uint8_t)lround(p * p * p * 255.0); // premultiplied black
  }
  if (dynAlphas) { free(dynAlphas); free(dynStops); }

  CGColorSpaceRef space = CGColorSpaceCreateDeviceRGB();
  CGContextRef ctx = CGBitmapContextCreate(pixels,
                                           vertical ? 1 : kMaskSamples,
                                           vertical ? kMaskSamples : 1,
                                           8,
                                           (vertical ? 1 : kMaskSamples) * 4,
                                           space,
                                           kCGImageAlphaPremultipliedLast);
  CGImageRef image = CGBitmapContextCreateImage(ctx);
  CGContextRelease(ctx);
  CGColorSpaceRelease(space);
  return image;
}

// ─── Veil colors ─────────────────────────────────────────────────────────────
//
// Builds `CAGradientLayer.colors` for a frost veil strip: transparent (inner) →
// `color` capped at VEIL_MAX_ALPHA (outer). Android-UNIFORM parity: the blur
// radius grows smoothly across the whole band, so the veil ramps the same
// way — a 16-stop smoothstep over the FULL band, independent of the fade curve
// (a curve-shaped ramp-then-plateau read as a hard tint line at low blur).
// VEIL_MAX_ALPHA matches Android's 0.6.

static const CGFloat kVeilMaxAlpha = 0.6;
static const int     kVeilStops    = 16;

static NSArray<id> *veilColors(UIColor *color)
{
  CGFloat r, g, b, a;
  [color getRed:&r green:&g blue:&b alpha:&a];

  CGColorSpaceRef space = CGColorSpaceCreateDeviceRGB();
  NSMutableArray *result = [NSMutableArray arrayWithCapacity:kVeilStops];
  for (int i = 0; i < kVeilStops; i++) {
    const CGFloat t = (CGFloat)i / (kVeilStops - 1);
    const CGFloat weight = t * t * (3.0 - 2.0 * t); // smoothstep
    // Cap so even the outer edge stays slightly translucent — a hint of blurred
    // content shows through, like iOS frosted material.
    CGFloat components[4] = {r, g, b, a * weight * kVeilMaxAlpha};
    CGColorRef c = CGColorCreate(space, components);
    [result addObject:(__bridge_transfer id)c];
  }
  CGColorSpaceRelease(space);
  return [result copy];
}

// Evenly-spaced locations matching veilColors' 16 smoothstep stops.
static NSArray<NSNumber *> *veilLocations(void)
{
  static NSArray<NSNumber *> *cached;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    NSMutableArray *locs = [NSMutableArray arrayWithCapacity:kVeilStops];
    for (int i = 0; i < kVeilStops; i++) [locs addObject:@((CGFloat)i / (kVeilStops - 1))];
    cached = [locs copy];
  });
  return cached;
}

// The JS side resolves the veil color to 0xAARRGGBB (0 = no veil); 0 maps to
// nil so veil layers stay unbuilt without one.
static UIColor * _Nullable colorFromARGB(int32_t argb)
{
  uint32_t u = (uint32_t)argb;
  if ((u >> 24) == 0) return nil;
  return [UIColor colorWithRed:((u >> 16) & 0xff) / 255.0
                         green:((u >> 8) & 0xff) / 255.0
                          blue:(u & 0xff) / 255.0
                         alpha:((u >> 24) & 0xff) / 255.0];
}

// ─── OneNativeEdgeFadeComponentView ───────────────────────────────────────────
//
// Mask mode: a single DestinationIn mask layer over the whole bounds. Blur
// mode: one variable blur strip per edge. There is deliberately no content
// view: in RCTViewComponentView children mount into the component view
// itself, and the mask must sit on self.layer to fade them. Overlay mode
// never reaches this view (RN core gradients paint it in JS).
@implementation OneNativeEdgeFadeComponentView {
  // Mask mode
  OneNativeEdgeFadeMaskLayer *_maskLayer;

  // Blur mode — one variable blur strip per edge, all four built with the
  // mode; an edge whose fade is 0 keeps its view hidden.
  OneNativeVariableBlurView *_blurViews[kEdgeFadeEdgeCount];

  // Frost veil — optional per-edge CAGradientLayers on top of the blur strips,
  // painted only when _veilColor is set (replicating Android behavior).
  CAGradientLayer *_frostTop, *_frostBottom, *_frostLeft, *_frostRight;

  // Veil color cache (the UNIFORM veil ramp is curve-independent, so the four
  // edges share one colors array — only the color needs caching).
  UIColor *_cachedVeilColorTop;

  // Current config
  OneNativeEdgeFadeRenderMode _renderMode;
  CGFloat   _fadeTop, _fadeBottom, _fadeLeft, _fadeRight;
  NSString *_curveTop, *_curveBottom, *_curveLeft, *_curveRight;
  UIColor  *_veilColor;
  CGFloat   _fadeRadius;
  CGFloat   _blurRadius;
  CGFloat   _frostProgression;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeEdgeFadeComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const OneNativeEdgeFadeProps>();
    _props = defaultProps;
    _renderMode = OneNativeEdgeFadeModeMask;
    _frostProgression = 1.0;
    // Continuous corner curve matches Apple's system squircle and composes more
    // cleanly with `layer.mask` than the default circular curve.
    if (@available(iOS 13.0, *)) {
      self.layer.cornerCurve = kCACornerCurveContinuous;
    }
  }
  return self;
}

// ─── Scale sync ──────────────────────────────────────────────────────────────
// Use the actual window's screen scale rather than `UIScreen.mainScreen` — the
// latter is wrong on iPad multi-window and external displays. The variable
// blur views sync their own backdrop scale on window entry.

- (CGFloat)_effectiveScale {
  UIScreen *screen = self.window.screen ?: UIScreen.mainScreen;
  return screen.scale;
}

- (void)_syncLayerScales {
  const CGFloat scale = [self _effectiveScale];
  if (_maskLayer && _maskLayer.contentsScale != scale) {
    _maskLayer.contentsScale = scale;
    [_maskLayer setNeedsDisplay];
  }
  if (_frostTop) {
    _frostTop.contentsScale = _frostBottom.contentsScale =
    _frostLeft.contentsScale = _frostRight.contentsScale = scale;
  }
}

- (void)didMoveToWindow {
  [super didMoveToWindow];
  [self _syncLayerScales];
}

- (void)traitCollectionDidChange:(UITraitCollection *)previousTraitCollection {
  [super traitCollectionDidChange:previousTraitCollection];
  [self _syncLayerScales];
}

// ─── Props update ────────────────────────────────────────────────────────────

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &p  = *std::static_pointer_cast<OneNativeEdgeFadeProps const>(props);
  // `oldProps` may be null on the first updateProps call. `_props` is always
  // valid (initialized to defaultProps in initWithFrame) and reflects the last
  // applied props after [super updateProps:].
  const auto &op = *std::static_pointer_cast<OneNativeEdgeFadeProps const>(_props);

  const BOOL sizeChanged  = p.fadeTop    != op.fadeTop    || p.fadeBottom != op.fadeBottom
                         || p.fadeLeft   != op.fadeLeft   || p.fadeRight  != op.fadeRight;
  const BOOL curveChanged = p.curveTop   != op.curveTop   || p.curveBottom != op.curveBottom
                         || p.curveLeft  != op.curveLeft  || p.curveRight  != op.curveRight;
  const BOOL colorChanged = p.overlayColor != op.overlayColor;
  const BOOL modeChanged        = p.mode       != op.mode;
  const BOOL radiusChanged      = p.fadeRadius != op.fadeRadius;
  const BOOL blurRadiusChanged  = p.blurRadius != op.blurRadius;
  const BOOL frostProgressionChanged = p.frostProgression != op.frostProgression;

  _fadeTop    = (CGFloat)p.fadeTop;    _fadeBottom = (CGFloat)p.fadeBottom;
  _fadeLeft   = (CGFloat)p.fadeLeft;   _fadeRight  = (CGFloat)p.fadeRight;
  _curveTop    = [NSString stringWithUTF8String:p.curveTop.c_str()];
  _curveBottom = [NSString stringWithUTF8String:p.curveBottom.c_str()];
  _curveLeft   = [NSString stringWithUTF8String:p.curveLeft.c_str()];
  _curveRight  = [NSString stringWithUTF8String:p.curveRight.c_str()];
  _veilColor = colorFromARGB(p.overlayColor);
  _blurRadius = (CGFloat)p.blurRadius;
  // JS clamps frostProgression to [0.05, 1]; re-clamp here for direct prop use.
  _frostProgression = MIN(MAX((CGFloat)p.frostProgression,
                              kEdgeFadeFrostProgressionMin), kEdgeFadeFrostProgressionMax);

  // Resolve the new render mode. Anything but "blur" is mask (overlay never
  // reaches this view).
  NSString *modeStr = [NSString stringWithUTF8String:p.mode.c_str()];
  OneNativeEdgeFadeRenderMode newMode =
      [@"blur" isEqualToString:modeStr] ? OneNativeEdgeFadeModeBlur : OneNativeEdgeFadeModeMask;

  // Rebuild layers when the mode flips OR when the layer for the current mode
  // is still missing (first updateProps call — `_props` defaults don't trigger
  // a mode flip when the user picks the default mode).
  const BOOL layerMissing = newMode == OneNativeEdgeFadeModeMask ? (_maskLayer == nil)
                                                                 : (_blurViews[0] == nil);

  if ((modeChanged && newMode != _renderMode) || layerMissing) {
    _renderMode = newMode;
    [self _teardownFadeLayers];
    [self _buildFadeLayers];
  } else if (_renderMode == OneNativeEdgeFadeModeMask) {
    if (sizeChanged || curveChanged) [self _syncMaskLayer];
  } else {
    // Blur mode — incremental updates.
    if (sizeChanged || blurRadiusChanged) [self _updateLayerFrames];
    if (curveChanged || blurRadiusChanged || frostProgressionChanged) [self _applyBlurMasks];
    if (colorChanged) {
      if (_veilColor) {
        if (!_frostTop) [self _buildFrostVeil];
        else            [self _rebuildVeilColors];
      } else {
        [self _teardownFrostVeil];
      }
    }
  }

  if (radiusChanged) {
    _fadeRadius = (CGFloat)p.fadeRadius;
    self.layer.cornerRadius  = _fadeRadius;
    self.layer.masksToBounds = (_fadeRadius > 0);
  }

  [super updateProps:props oldProps:oldProps];
}

// ─── Layout ──────────────────────────────────────────────────────────────────

- (void)layoutSubviews {
  [super layoutSubviews];
  [self _updateLayerFrames];
  // heal the mask if core's clipping pipeline cleared it without running
  // our invalidateLayer override (renamed selector on a future RN).
  if (_renderMode == OneNativeEdgeFadeModeMask && _maskLayer && self.layer.mask != _maskLayer) {
    self.layer.mask = _maskLayer;
  }
}

// RCTViewComponentView.invalidateLayer resets the layer mask to nil during its
// border/clipping pipeline. Re-apply our mask after super has finished,
// otherwise mask mode never paints.
- (void)invalidateLayer {
  [super invalidateLayer];
  if (_renderMode == OneNativeEdgeFadeModeMask && _maskLayer && self.layer.mask != _maskLayer) {
    self.layer.mask = _maskLayer;
  }
}

- (void)didAddSubview:(UIView *)subview {
  [super didAddSubview:subview];
  // Subview layers are appended to self.layer.sublayers and would otherwise sit
  // above our blur strips. Re-adding moves each strip back on top; ordering
  // between edges is indifferent (see the corner note above).
  if (_renderMode == OneNativeEdgeFadeModeBlur && _blurViews[0] && ![self _isBlurView:subview]) {
    for (NSInteger e = 0; e < kEdgeFadeEdgeCount; e++) {
      [self addSubview:_blurViews[e]];
    }
    if (_frostTop) {
      [self.layer addSublayer:_frostTop];
      [self.layer addSublayer:_frostBottom];
      [self.layer addSublayer:_frostLeft];
      [self.layer addSublayer:_frostRight];
    }
  }
}

// ─── Fade layer management ───────────────────────────────────────────────────

- (void)_teardownFadeLayers {
  // Mask mode
  self.layer.mask = nil;
  _maskLayer = nil;

  // Blur mode
  [self _teardownFrostVeil];
  for (NSInteger e = 0; e < kEdgeFadeEdgeCount; e++) {
    [_blurViews[e] removeFromSuperview];
    _blurViews[e] = nil;
  }
}

- (void)_buildFadeLayers {
  if (_renderMode == OneNativeEdgeFadeModeMask) {
    _maskLayer = [OneNativeEdgeFadeMaskLayer layer];
    _maskLayer.contentsScale = [self _effectiveScale];
    _maskLayer.frame = self.bounds;
    self.layer.mask = _maskLayer;
    [self _syncMaskLayer];
  } else {
    for (NSInteger e = 0; e < kEdgeFadeEdgeCount; e++) {
      _blurViews[e] = [OneNativeVariableBlurView new];
      [self addSubview:_blurViews[e]];
    }
    [self _applyBlurMasks];
    if (_veilColor) [self _buildFrostVeil];
    [self _updateLayerFrames];
  }
}

// ─── Mask mode ───────────────────────────────────────────────────────────────

// Update the mask layer state and invalidate only the strips that actually
// changed. Each dirty rect spans MAX(old, new) so the previous fade extent is
// erased before the new gradient is drawn. CG sets the context clip to the
// dirty rect inside drawInContext: — the existing draw code restricts itself
// to that clip without any change.
- (void)_syncMaskLayer {
  if (!_maskLayer) return;

  const CGFloat oldTop    = _maskLayer.fadeTop;
  const CGFloat oldBottom = _maskLayer.fadeBottom;
  const CGFloat oldLeft   = _maskLayer.fadeLeft;
  const CGFloat oldRight  = _maskLayer.fadeRight;
  NSString *oldCurveTop    = _maskLayer.curveTop;
  NSString *oldCurveBottom = _maskLayer.curveBottom;
  NSString *oldCurveLeft   = _maskLayer.curveLeft;
  NSString *oldCurveRight  = _maskLayer.curveRight;

  _maskLayer.fadeTop    = _fadeTop;   _maskLayer.fadeBottom = _fadeBottom;
  _maskLayer.fadeLeft   = _fadeLeft;  _maskLayer.fadeRight  = _fadeRight;
  _maskLayer.curveTop   = _curveTop;  _maskLayer.curveBottom = _curveBottom;
  _maskLayer.curveLeft  = _curveLeft; _maskLayer.curveRight  = _curveRight;

  const CGFloat w = CGRectGetWidth(_maskLayer.bounds);
  const CGFloat h = CGRectGetHeight(_maskLayer.bounds);
  if (w <= 0 || h <= 0) {
    // No bounds yet — full invalidate; layoutSubviews triggers the first draw.
    [_maskLayer setNeedsDisplay];
    return;
  }

  const BOOL topChanged    = oldTop    != _fadeTop    || ![oldCurveTop    isEqualToString:_curveTop];
  const BOOL bottomChanged = oldBottom != _fadeBottom || ![oldCurveBottom isEqualToString:_curveBottom];
  const BOOL leftChanged   = oldLeft   != _fadeLeft   || ![oldCurveLeft   isEqualToString:_curveLeft];
  const BOOL rightChanged  = oldRight  != _fadeRight  || ![oldCurveRight  isEqualToString:_curveRight];

  if (topChanged) {
    CGFloat extent = MAX(oldTop, _fadeTop);
    [_maskLayer setNeedsDisplayInRect:CGRectMake(0, 0, w, extent)];
  }
  if (bottomChanged) {
    CGFloat extent = MAX(oldBottom, _fadeBottom);
    [_maskLayer setNeedsDisplayInRect:CGRectMake(0, h - extent, w, extent)];
  }
  if (leftChanged) {
    CGFloat extent = MAX(oldLeft, _fadeLeft);
    [_maskLayer setNeedsDisplayInRect:CGRectMake(0, 0, extent, h)];
  }
  if (rightChanged) {
    CGFloat extent = MAX(oldRight, _fadeRight);
    [_maskLayer setNeedsDisplayInRect:CGRectMake(w - extent, 0, extent, h)];
  }
}

// ─── Blur mode ───────────────────────────────────────────────────────────────

// YES if `view` is one of the blur strips. Used by didAddSubview: to avoid
// re-adding a strip in response to its own insertion.
- (BOOL)_isBlurView:(UIView *)view {
  for (NSInteger e = 0; e < kEdgeFadeEdgeCount; e++) {
    if (view == _blurViews[e]) return YES;
  }
  return NO;
}

// Rebuild every strip's mask from its edge's curve and frostProgression and
// push it with the current radius. Masks are 1-pixel-thick and resolution
// independent, so a fade size change only reframes the strip.
- (void)_applyBlurMasks {
  NSString *curves[kEdgeFadeEdgeCount] = {_curveTop, _curveBottom, _curveLeft, _curveRight};
  for (NSInteger e = 0; e < kEdgeFadeEdgeCount; e++) {
    CGImageRef mask = createEdgeBlurMask((OneNativeEdgeFadeEdge)e, curves[e] ?: @"smooth",
                                         _frostProgression);
    [_blurViews[e] updateWithRadius:_blurRadius mask:mask];
    CGImageRelease(mask);
  }
}

// ─── Frost veil (blur mode only) ─────────────────────────────────────────────
//
// Four CAGradientLayers stacked above the blur strips, one per edge,
// transparent (inner) → veil color (outer, capped at VEIL_MAX_ALPHA). Opt-in:
// only created when _veilColor is non-nil, replicating Android's drawFrostVeil.

- (void)_buildFrostVeil {
  if (_frostTop) return; // already built
  const CGFloat scale = [self _effectiveScale];

  _frostTop    = [self _makeFrostLayerWithScale:scale];
  _frostBottom = [self _makeFrostLayerWithScale:scale];
  _frostLeft   = [self _makeFrostLayerWithScale:scale];
  _frostRight  = [self _makeFrostLayerWithScale:scale];

  [self _rebuildVeilColors];
  [self _updateLayerFrames];
}

- (CAGradientLayer *)_makeFrostLayerWithScale:(CGFloat)scale {
  CAGradientLayer *layer = [CAGradientLayer layer];
  layer.contentsScale = scale;
  [self.layer addSublayer:layer];
  return layer;
}

- (void)_teardownFrostVeil {
  [_frostTop    removeFromSuperlayer];
  [_frostBottom removeFromSuperlayer];
  [_frostLeft   removeFromSuperlayer];
  [_frostRight  removeFromSuperlayer];
  _frostTop = _frostBottom = _frostLeft = _frostRight = nil;
  _cachedVeilColorTop = nil;
}

// The UNIFORM veil ramp is curve-independent (see veilColors), so the four
// edges share one colors array and only the color enters the cache key.
- (void)_rebuildVeilColors {
  if (!_frostTop || !_veilColor) return;
  UIColor *color = _veilColor;
  if ([color isEqual:_cachedVeilColorTop]) return;

  NSArray<id> *colors          = veilColors(color);
  NSArray<NSNumber *> *locs    = veilLocations();
  _frostTop.colors    = colors; _frostTop.locations    = locs;
  _frostBottom.colors = colors; _frostBottom.locations = locs;
  _frostLeft.colors   = colors; _frostLeft.locations   = locs;
  _frostRight.colors  = colors; _frostRight.locations  = locs;
  _cachedVeilColorTop = color;
}

// ─── Frame sync ──────────────────────────────────────────────────────────────

- (void)_updateLayerFrames {
  const CGFloat w = CGRectGetWidth(self.bounds);
  const CGFloat h = CGRectGetHeight(self.bounds);

  if (_renderMode == OneNativeEdgeFadeModeMask) {
    if (!_maskLayer) return;
    // needsDisplayOnBoundsChange is YES — CA invalidates on bounds change
    // automatically. No explicit setNeedsDisplay needed for origin-only frame
    // shifts (the rendered bitmap is in layer-local coordinates).
    _maskLayer.frame = self.bounds;
    return;
  }

  // Blur mode.
  if (!_blurViews[0]) {
    return;
  }
  [CATransaction begin];
  [CATransaction setDisableActions:YES];

  // Strip rects per edge; an edge whose fade is 0, or a 0 radius, hides its
  // strip (a hidden effect view runs no backdrop pass).
  const CGFloat top = MIN(h, _fadeTop), bottom = MIN(h, _fadeBottom);
  const CGFloat left = MIN(w, _fadeLeft), right = MIN(w, _fadeRight);
  const CGRect strips[kEdgeFadeEdgeCount] = {
    CGRectMake(0, 0, w, top),
    CGRectMake(0, h - bottom, w, bottom),
    CGRectMake(0, 0, left, h),
    CGRectMake(w - right, 0, right, h),
  };
  for (NSInteger e = 0; e < kEdgeFadeEdgeCount; e++) {
    const CGRect strip = strips[e];
    _blurViews[e].hidden = CGRectIsEmpty(strip) || _blurRadius <= 0;
    _blurViews[e].frame = strip;
  }

  // Frost veil layers.
  if (_frostTop) {
    _frostTop.frame      = strips[OneNativeEdgeFadeEdgeTop];
    _frostTop.startPoint = CGPointMake(0.5, 1); _frostTop.endPoint = CGPointMake(0.5, 0);
    _frostTop.hidden     = (_fadeTop <= 0);

    _frostBottom.frame      = strips[OneNativeEdgeFadeEdgeBottom];
    _frostBottom.startPoint = CGPointMake(0.5, 0); _frostBottom.endPoint = CGPointMake(0.5, 1);
    _frostBottom.hidden     = (_fadeBottom <= 0);

    _frostLeft.frame      = strips[OneNativeEdgeFadeEdgeLeft];
    _frostLeft.startPoint = CGPointMake(1, 0.5); _frostLeft.endPoint = CGPointMake(0, 0.5);
    _frostLeft.hidden     = (_fadeLeft <= 0);

    _frostRight.frame      = strips[OneNativeEdgeFadeEdgeRight];
    _frostRight.startPoint = CGPointMake(0, 0.5); _frostRight.endPoint = CGPointMake(1, 0.5);
    _frostRight.hidden     = (_fadeRight <= 0);
  }

  [CATransaction commit];
}

@end
