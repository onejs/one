// vendored from react-native-edge-fade (MIT, Copyright (c) 2026 Giulio Amato),
// trimmed to mask + blur for OneNativeEdgeFade (overlay lives in RN core).
// see VENDORING.md.
#import "OneNativeEdgeFadeComponentView.h"
#import "OneNativeEdgeFadeBlurMaskLayer.h"
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
  OneNativeEdgeFadeModeBlur, // UIVisualEffectView blur stack, edge-masked, optional veil
};

// ─── Progressive-blur model (blur mode) ───────────────────────────────────────
//
// True progressive blur (Apple Music) is not one blur cross-faded — it is a
// stack of increasing-radius blurs. The fade curve is the envelope of the
// perceived radius across the WHOLE band (Android parity): along the band
// (inner t=0 → outer t=1), `u = min(t/frostProgression, 1)` compresses the
// curve's presence envelope into the inner `frostProgression` fraction of the
// band, `P = presenceAt(curve, u)`, and each level k resolves its own
// [sliceLo,sliceHi] slice of P:
//   slices = { [0,0.35], [0.35,0.65], [0.65,1.0] }
// Level 0 uses the raw slice weight (the visible sharp→frost transition, so
// editing the curve reshapes it directly); levels 1-2 apply a zero-slope
// smoothstep to their slice weight as an anti-banding pass, since their
// fade-ins are internal cross-fades between two blur radii. The three views
// stack in increasing radius, so the perceived radius grows toward the outer
// edge following the curve's own shape — the bottom of the band ends up the
// most blurred.
//
// Per-level blur *intensity* is tied to _blurRadius scaled by F[k]: level 0
// tops out at a third of the radius, level 2 at the full radius, so at
// blurRadius = 0 every level's fraction is 0 and the stack is visually neutral.
//
// ── Band clipping (cost) ──
// A UIVisualEffectView's backdrop blur is a per-frame gaussian sample of
// everything behind it, and its cost scales with the *area* of the view. The
// fade only ever occupies thin strips along the edges, so covering the whole
// bounds with each effect view wastes the backdrop pass over the (sharp,
// weight-0) interior. Instead of 3 full-bounds views we render a matrix of
// per-edge × per-level effect views, each clipped to just its edge's fade strip
// (expanded by an inner padding, below). Views for an edge whose fade is 0 are
// `hidden` and cost nothing: CoreAnimation does not composite a hidden layer,
// so it never triggers a backdrop pass (a hidden UIVisualEffectView is free).
//
// ── Inner padding p_k ──
// The backdrop blur samples only pixels *inside* the effect view and clamps at
// the view's edge. A strip sized exactly to `fade_edge` would show a hard seam
// at its inner border where the clamp meets the sharp interior. We over-extend
// each strip inward by p_k = _blurRadius · F[k] (clamped to bounds) so the blur
// has real content to sample across the seam. The mask weight is 0 throughout
// that padding (the ramp only occupies the outer `fade_edge` pt), so no extra
// blur becomes visible — the padding exists purely to feed the sampler.
//
// ── Corners (tradeoff) ──
// Where two edges' fades overlap (a corner) their two per-edge stacks composite
// independently. The result is ~the stronger of the two contributions rather
// than an exact 2-D blend, which is visually indistinguishable in practice and
// accepted for the large area win.

static const NSInteger kEdgeFadeBlurLevels = 3;

// Edge indices into the per-edge × per-level matrices below.
typedef NS_ENUM(NSInteger, OneNativeEdgeFadeEdge) {
  OneNativeEdgeFadeEdgeTop = 0,
  OneNativeEdgeFadeEdgeBottom = 1,
  OneNativeEdgeFadeEdgeLeft = 2,
  OneNativeEdgeFadeEdgeRight = 3,
};
static const NSInteger kEdgeFadeEdgeCount = 4;

// Per-level radius fraction F[k] (level k's blur tops out at blurRadius·F[k]),
// doubling as each level's [lo,hi] slice of the curve's presence envelope
// (lo = the previous entry, or 0 for k=0).
static const CGFloat kEdgeFadeLevelFractions[kEdgeFadeBlurLevels] = {0.35, 0.65, 1.0};

// frostProgression clamp bounds (JS clamps too; this guards direct prop use).
static const CGFloat kEdgeFadeFrostProgressionMin = 0.05;
static const CGFloat kEdgeFadeFrostProgressionMax = 1.0;

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

// Max opacity of the saturation-compensation layer at the outer edge. Tuned
// against Android's frost grade on saturated content (chroma parity within a
// few points at the band's outer edge).
static const CGFloat kEdgeFadeSatCompMax = 0.6;

// Gray ramp for the saturation-compensation layers: the blend takes only the
// SOURCE's saturation (zero, any gray) and keeps the backdrop's hue/luminosity,
// so the gray value itself is irrelevant — alpha sets the desaturation amount.
// Smoothstep across the full band, in lockstep with the blur's own ramp.
static NSArray<id> *satCompColors(void)
{
  static NSArray<id> *cached;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    CGColorSpaceRef space = CGColorSpaceCreateDeviceRGB();
    NSMutableArray *result = [NSMutableArray arrayWithCapacity:kVeilStops];
    for (int i = 0; i < kVeilStops; i++) {
      const CGFloat t = (CGFloat)i / (kVeilStops - 1);
      const CGFloat weight = t * t * (3.0 - 2.0 * t); // smoothstep
      CGFloat components[4] = {0.5, 0.5, 0.5, weight * kEdgeFadeSatCompMax};
      CGColorRef c = CGColorCreate(space, components);
      [result addObject:(__bridge_transfer id)c];
    }
    CGColorSpaceRelease(space);
    cached = [result copy];
  });
  return cached;
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

// ─── Pure-blur effect view ────────────────────────────────────────────────────
// UIVisualEffectView composes its effect out of a backdrop-blur subview plus
// tint/luminosity subviews that produce a milky white lift at partial and full
// intensity. One-shot stripping (hide them after configuring the effect) is not
// enough: UIKit re-creates/unhides those subviews asynchronously whenever it
// re-applies the effect — often a runloop tick AFTER our strip ran, so the wash
// came back (visible as a uniform brightness lift on the blurred half). This
// subclass enforces the strip structurally: any non-Backdrop subview is hidden
// the moment it is added and re-hidden on every layout pass. Introspection is
// public class-name strings only (App Store-safe).

@interface OneNativeEdgeFadePureBlurView : UIVisualEffectView
@end

@implementation OneNativeEdgeFadePureBlurView

- (void)didAddSubview:(UIView *)subview {
  [super didAddSubview:subview];
  if (![NSStringFromClass(subview.class) containsString:@"Backdrop"]) {
    subview.hidden = YES;
  }
}

- (void)layoutSubviews {
  [super layoutSubviews];
  for (UIView *subview in self.subviews) {
    const BOOL keep = [NSStringFromClass(subview.class) containsString:@"Backdrop"];
    if (subview.hidden == keep) subview.hidden = !keep;
  }
}

@end

// ─── OneNativeEdgeFadeComponentView ───────────────────────────────────────────
//
// Mask mode: a single DestinationIn mask layer over the whole bounds. Blur
// mode: a per-edge × per-level UIVisualEffectView matrix with windowed masks.
// There is deliberately no content view: in RCTViewComponentView children
// mount into the component view itself, and the mask must sit on self.layer
// to fade them. Overlay mode never reaches this view (RN core gradients
// paint it in JS).
@implementation OneNativeEdgeFadeComponentView {
  // Mask mode
  OneNativeEdgeFadeMaskLayer *_maskLayer;

  // Blur mode — a per-edge × per-level matrix of progressive-blur strips.
  // For each of the 4 edges there is a 3-level stack; each cell is a
  // UIVisualEffectView clipped to that edge's fade strip (see the
  // band-clipping note above), masked by its own windowed
  // OneNativeEdgeFadeBlurMaskLayer, driven by a paused UIViewPropertyAnimator
  // for fractional intensity. Level 0 (smallest radius, presence window
  // [0,1/3]) sits lowest within an edge; level 2 (largest, [2/3,1]) sits on
  // top. All 12 views exist for the lifetime of the build; an edge whose fade
  // is 0 has its views `hidden` (a hidden effect view triggers no backdrop
  // pass). Fixed C matrices rather than NSArray: the counts are compile-time
  // constants (4×3), the elements are strong-held ivars anyway, and index
  // access keeps the loops terse.
  UIVisualEffectView            *_blurViews[kEdgeFadeEdgeCount][kEdgeFadeBlurLevels];
  UIViewPropertyAnimator        *_blurAnimators[kEdgeFadeEdgeCount][kEdgeFadeBlurLevels];
  OneNativeEdgeFadeBlurMaskLayer *_blurMaskLayers[kEdgeFadeEdgeCount][kEdgeFadeBlurLevels];

  // Frost veil — optional per-edge CAGradientLayers on top of the blur stack,
  // painted only when _veilColor is set (replicating Android behavior).
  CAGradientLayer *_frostTop, *_frostBottom, *_frostLeft, *_frostRight;

  // Saturation compensation — always-on per-edge gray gradient layers between
  // the blur stack and the frost veil, composited with the public
  // `saturationBlendMode` CA filter. UIBlurEffect's backdrop bakes a
  // colorSaturate boost into its recipe (measured ~+45% chroma at the outer
  // edge vs Android's graded pipeline) that public API cannot strip from the
  // effect itself; blending a zero-saturation source over it pulls the result
  // back toward the Android look, ramped with the blur so the interior is
  // untouched.
  CAGradientLayer *_satTop, *_satBottom, *_satLeft, *_satRight;

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
// latter is wrong on iPad multi-window and external displays.

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
  for (NSInteger e = 0; e < kEdgeFadeEdgeCount; e++) {
    for (NSInteger k = 0; k < kEdgeFadeBlurLevels; k++) {
      OneNativeEdgeFadeBlurMaskLayer *m = _blurMaskLayers[e][k];
      if (m && m.contentsScale != scale) {
        m.contentsScale = scale;
        [m setNeedsDisplay];
      }
    }
  }
  if (_frostTop) {
    _frostTop.contentsScale = _frostBottom.contentsScale =
    _frostLeft.contentsScale = _frostRight.contentsScale = scale;
  }
  if (_satTop) {
    _satTop.contentsScale = _satBottom.contentsScale =
    _satLeft.contentsScale = _satRight.contentsScale = scale;
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
  BOOL layerMissing;
  switch (newMode) {
    case OneNativeEdgeFadeModeMask: layerMissing = (_maskLayer == nil);      break;
    case OneNativeEdgeFadeModeBlur: layerMissing = (_blurViews[0][0] == nil); break;
    default:                        layerMissing = NO;                       break;
  }

  if ((modeChanged && newMode != _renderMode) || layerMissing) {
    _renderMode = newMode;
    [self _teardownFadeLayers];
    [self _buildFadeLayers];
  } else if (_renderMode == OneNativeEdgeFadeModeMask) {
    if (sizeChanged || curveChanged) [self _syncMaskLayer];
  } else {
    // Blur mode — incremental updates.
    if (sizeChanged || curveChanged) [self _syncBlurMaskLayers];
    if (sizeChanged) {
      [self _updateLayerFrames];
      [self _invalidateBlurMaskLayers];
    }
    if (curveChanged) {
      [self _invalidateBlurMaskLayers];
    }
    if (colorChanged) {
      if (_veilColor) {
        if (!_frostTop) [self _buildFrostVeil];
        else            [self _rebuildVeilColors];
      } else {
        [self _teardownFrostVeil];
      }
    }
    if (blurRadiusChanged) {
      [self _updateLayerFrames];
      [self _applyBlurFraction];
    }
    if (frostProgressionChanged) {
      // Every level resolves the curve's envelope through frostProgression,
      // so all 12 masks (4 edges × 3 levels) need the new value.
      for (NSInteger e = 0; e < kEdgeFadeEdgeCount; e++) {
        for (NSInteger k = 0; k < kEdgeFadeBlurLevels; k++) {
          OneNativeEdgeFadeBlurMaskLayer *m = _blurMaskLayers[e][k];
          m.frostProgression = _frostProgression;
          [m setNeedsDisplay];
        }
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
  // above our blur layers. Re-adding moves the layer to the end of the
  // sublayers array → back on top. Ordering *between* edges is indifferent —
  // where two edges overlap at a corner their stacks composite independently.
  if (_renderMode == OneNativeEdgeFadeModeBlur && _blurViews[0][0] && ![self _isBlurView:subview]) {
    // Keep all blur strips (and veil layers on their superlayer) above
    // content. Re-add edge by edge, in level order so radius stacks low → high
    // (0 under 2) within each edge.
    for (NSInteger e = 0; e < kEdgeFadeEdgeCount; e++) {
      for (NSInteger k = 0; k < kEdgeFadeBlurLevels; k++) {
        if (_blurViews[e][k]) [self addSubview:_blurViews[e][k]];
      }
    }
    if (_satTop) {
      [self.layer addSublayer:_satTop];
      [self.layer addSublayer:_satBottom];
      [self.layer addSublayer:_satLeft];
      [self.layer addSublayer:_satRight];
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

  // Blur mode — frost veil first, then each level's animator + view + mask.
  [self _teardownFrostVeil];

  [self _neutralizeBlurAnimators];
  for (NSInteger e = 0; e < kEdgeFadeEdgeCount; e++) {
    for (NSInteger k = 0; k < kEdgeFadeBlurLevels; k++) {
      [_blurViews[e][k] removeFromSuperview];
      _blurViews[e][k] = nil;
      _blurMaskLayers[e][k] = nil;
    }
  }
}

// Stop + finish every paused blur animator before it can be released — a
// UIViewPropertyAnimator deallocated while active/paused raises an
// NSException (reproduced on RN dev reload, where the view deallocs without
// a mode flip ever running _teardownFadeLayers). The legal sequence is
// stopAnimation:NO (→ .stopped) followed by finishAnimationAtPosition: —
// finish on an animator stopped with `withoutFinishing:YES` (→ .inactive)
// itself raises. An `.inactive` animator needs neither call, so it is skipped.
- (void)_neutralizeBlurAnimators {
  for (NSInteger e = 0; e < kEdgeFadeEdgeCount; e++) {
    for (NSInteger k = 0; k < kEdgeFadeBlurLevels; k++) {
      UIViewPropertyAnimator *animator = _blurAnimators[e][k];
      if (animator != nil) {
        if (animator.state == UIViewAnimatingStateActive) {
          [animator stopAnimation:NO];
        }
        if (animator.state == UIViewAnimatingStateStopped) {
          [animator finishAnimationAtPosition:UIViewAnimatingPositionCurrent];
        }
        _blurAnimators[e][k] = nil;
      }
    }
  }
}

- (void)dealloc {
  [self _neutralizeBlurAnimators];
}

- (void)_buildFadeLayers {
  if (_renderMode == OneNativeEdgeFadeModeMask) {
    _maskLayer = [OneNativeEdgeFadeMaskLayer layer];
    _maskLayer.contentsScale = [self _effectiveScale];
    _maskLayer.frame = self.bounds;
    self.layer.mask = _maskLayer;
    [self _syncMaskLayer];
  } else {
    // Blur mode — build blur view + mask, then optionally the frost veil.
    [self _buildBlurView];
    if (_veilColor) [self _buildFrostVeil];
    [self _updateLayerFrames];
    [self _applyBlurFraction];
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

// YES if `view` is one of the blur-level effect views. Used by didAddSubview: to
// avoid re-adding a blur view in response to its own insertion.
- (BOOL)_isBlurView:(UIView *)view {
  for (NSInteger e = 0; e < kEdgeFadeEdgeCount; e++) {
    for (NSInteger k = 0; k < kEdgeFadeBlurLevels; k++) {
      if (view == _blurViews[e][k]) return YES;
    }
  }
  return NO;
}

// Each mask layer's fade/curve properties are only ever set here — the layers
// themselves never read _fadeTop/_curveTop etc. directly — so without this,
// property changes after the initial build would leave the masks stale.
// sliceLo/sliceHi are set once at build time; frostProgression (shared by all
// levels) is updated from updateProps when the prop changes. Callers
// invalidate via _invalidateBlurMaskLayers.
//
// Per-edge masks: each strip's mask draws in the STRIP's local coordinates and
// carries ONLY its own edge's fade (the other three are 0), so the mask paints a
// single ramp anchored to the strip's outer edge and leaves the inner padding
// transparent (weight 0). The blur-mask layer already anchors each edge's ramp
// to the matching side of its own bounds (top ramp to the top, bottom ramp to
// the bottom, etc.), so setting fade<edge> = _fade<edge> produces the correct
// ramp regardless of where the strip sits inside the view.
- (void)_syncBlurMaskLayers {
  for (NSInteger e = 0; e < kEdgeFadeEdgeCount; e++) {
    for (NSInteger k = 0; k < kEdgeFadeBlurLevels; k++) {
      OneNativeEdgeFadeBlurMaskLayer *m = _blurMaskLayers[e][k];
      if (!m) continue;
      m.fadeTop = m.fadeBottom = m.fadeLeft = m.fadeRight = 0;
      switch (e) {
        case OneNativeEdgeFadeEdgeTop:    m.fadeTop    = _fadeTop;    m.curveTop    = _curveTop;    break;
        case OneNativeEdgeFadeEdgeBottom: m.fadeBottom = _fadeBottom; m.curveBottom = _curveBottom; break;
        case OneNativeEdgeFadeEdgeLeft:   m.fadeLeft   = _fadeLeft;   m.curveLeft   = _curveLeft;   break;
        case OneNativeEdgeFadeEdgeRight:  m.fadeRight  = _fadeRight; m.curveRight  = _curveRight;  break;
      }
    }
  }
}

- (void)_invalidateBlurMaskLayers {
  for (NSInteger e = 0; e < kEdgeFadeEdgeCount; e++) {
    for (NSInteger k = 0; k < kEdgeFadeBlurLevels; k++) {
      [_blurMaskLayers[e][k] setNeedsDisplay];
    }
  }
}

// Build the per-edge × per-level progressive-blur matrix: for each of the 4
// edges and 3 levels, a windowed blur mask + a nil-effect UIVisualEffectView +
// a paused animator. The views are inserted as subviews so RN's layout system
// ignores them; each mask layer is assigned to its own view's layer.mask.
// Within an edge, levels are added in increasing radius order (0 first →
// lowest), so higher radii stack on top. All 12 views are created up front;
// _updateLayerFrames later hides the edges whose fade is 0.
- (void)_buildBlurView {
  const CGFloat scale = [self _effectiveScale];

  for (NSInteger e = 0; e < kEdgeFadeEdgeCount; e++) {
    for (NSInteger k = 0; k < kEdgeFadeBlurLevels; k++) {
      // Windowed blur mask — grayscale bitmap gating this level's slice of the band.
      OneNativeEdgeFadeBlurMaskLayer *mask = [OneNativeEdgeFadeBlurMaskLayer layer];
      mask.contentsScale = scale;
      mask.sliceLo = (k == 0 ? 0.0 : kEdgeFadeLevelFractions[k - 1]);
      mask.sliceHi = kEdgeFadeLevelFractions[k];
      mask.frostProgression = _frostProgression;
      mask.curveShaped = (k == 0);
      _blurMaskLayers[e][k] = mask;

      // Effect view with nil effect; the animator drives the effect below.
      UIVisualEffectView *view = [[OneNativeEdgeFadePureBlurView alloc] initWithEffect:nil];
      view.userInteractionEnabled = NO;
      view.layer.mask = mask;
      _blurViews[e][k] = view;

      [self addSubview:view];

      // Paused UIViewPropertyAnimator trick: set fractionComplete to drive blur
      // intensity without animating. Must retain the animator — paused animators
      // dealloc mid-flight if released, producing a visual glitch.
      //
      // Style is unified to UIBlurEffectStyleRegular on every OS version — the
      // `.systemXThinMaterial` family is not a pure gaussian blur:
      // UIVisualEffectView layers extra tint/luminosity subviews on top of the
      // backdrop blur to match system chrome, and at partial fractionComplete
      // those subviews still show through as a milky white glow, even with the
      // frost veil disabled. `.regular` gets us the closest thing to a plain
      // backdrop blur (à la Apple Music's progressive blur), which
      // _stripVisualEffectTintOn: then cleans up further.
      __weak UIVisualEffectView *weakView = view;
      UIBlurEffect *effect = [UIBlurEffect effectWithStyle:UIBlurEffectStyleRegular];
      UIViewPropertyAnimator *animator = [[UIViewPropertyAnimator alloc] initWithDuration:1
                                                                                   curve:UIViewAnimationCurveLinear
                                                                              animations:^{
        weakView.effect = effect;
      }];
      animator.pausesOnCompletion = YES;
      _blurAnimators[e][k] = animator;

      // Deferred activation: the animator stays `.inactive` until the first
      // `_applyBlurFraction` call with a non-zero fraction. This avoids the
      // startAnimation+pauseAnimation cost per animator when blurRadius is 0
      // (initial mount). The effect's tint subviews are not instantiated until
      // activation, so _stripVisualEffectTintOn: is a no-op here.

      [self _stripVisualEffectTintOn:view];
    }
  }

  [self _syncBlurMaskLayers];
  [self _applyBlurFraction];

  // Saturation compensation layers — above the blur stack (added after the
  // effect subviews), below the frost veil (built later, so it lands on top).
  _satTop    = [self _makeSatCompLayerWithScale:scale];
  _satBottom = [self _makeSatCompLayerWithScale:scale];
  _satLeft   = [self _makeSatCompLayerWithScale:scale];
  _satRight  = [self _makeSatCompLayerWithScale:scale];
}

- (CAGradientLayer *)_makeSatCompLayerWithScale:(CGFloat)scale {
  CAGradientLayer *layer = [CAGradientLayer layer];
  layer.contentsScale = scale;
  layer.colors    = satCompColors();
  layer.locations = veilLocations();
  // Public CA blend-mode filter name (CALayer.compositingFilter) — takes the
  // source's saturation (zero) and the destination's hue/luminosity.
  layer.compositingFilter = @"saturationBlendMode";
  [self.layer addSublayer:layer];
  return layer;
}

// UIVisualEffectView composes its blur effect out of several private subviews
// (backdrop blur + tint + luminosity), stacked to approximate system materials.
// The tint/luminosity layers are what produces the milky glow at partial
// intensity — hiding everything except the backdrop blur subview leaves a pure
// gaussian blur behind. This only inspects public class-name strings (no
// NSClassFromString, no KVC on private keys), so it stays within documented,
// App Store-safe introspection.
- (void)_stripVisualEffectTintOn:(UIVisualEffectView *)blurView {
  for (UIView *subview in blurView.subviews) {
    subview.hidden = ![NSStringFromClass(subview.class) containsString:@"Backdrop"];
  }
}

// Map blurRadius (default 28, range 0–∞) to a per-level fraction in [0, 1] for
// each animator. Level k tops out at _blurRadius * F[k]; 40 pt radius → level 2
// (F=1) reaches fraction 1.0, level 0 (F=1/3) reaches ~0.33 — a rising radius
// ramp across the stack. At blurRadius = 0 every level's fraction is 0, so the
// whole stack is visually neutral.
- (void)_applyBlurFraction {
  for (NSInteger e = 0; e < kEdgeFadeEdgeCount; e++) {
    for (NSInteger k = 0; k < kEdgeFadeBlurLevels; k++) {
      UIViewPropertyAnimator *animator = _blurAnimators[e][k];
      if (!animator) continue;

      const float fraction = MIN(MAX(_blurRadius * kEdgeFadeLevelFractions[k] / 40.0, 0.0), 1.0);

      // Lazy activation: a freshly-built animator is `.inactive`;
      // fractionComplete is a no-op in that state. Activate only when a
      // non-zero fraction is actually needed; skip everything when fraction=0
      // and the animator hasn't been activated yet, so the initial mount with
      // blurRadius=0 stays completely free.
      if (animator.state == UIViewAnimatingStateInactive) {
        if (fraction == 0) continue;
        [animator startAnimation];
        [animator pauseAnimation];
        [self _stripVisualEffectTintOn:_blurViews[e][k]];
      }

      // UIKit can re-instantiate the effect's tint/luminosity subviews whenever it
      // re-applies the effect (e.g. after a fractionComplete scrub), so re-strip on
      // every call. The subview list is short (2-3 entries), so this is cheap.
      [self _stripVisualEffectTintOn:_blurViews[e][k]];
      animator.fractionComplete = fraction;
    }
  }
}

// ─── Frost veil (blur mode only) ─────────────────────────────────────────────
//
// Four CAGradientLayers stacked above the whole blur-level stack, one per edge,
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
  [_satTop    removeFromSuperlayer];
  [_satBottom removeFromSuperlayer];
  [_satLeft   removeFromSuperlayer];
  [_satRight  removeFromSuperlayer];
  _satTop = _satBottom = _satLeft = _satRight = nil;

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
  if (!_blurViews[0][0]) {
    return;
  }
  [CATransaction begin];
  [CATransaction setDisableActions:YES];

  // Per-edge fade extents; an edge whose fade is 0 hides its whole stack.
  const CGFloat fades[kEdgeFadeEdgeCount] = {_fadeTop, _fadeBottom, _fadeLeft, _fadeRight};

  for (NSInteger e = 0; e < kEdgeFadeEdgeCount; e++) {
    const BOOL edgeActive = (fades[e] > 0);
    for (NSInteger k = 0; k < kEdgeFadeBlurLevels; k++) {
      UIVisualEffectView *view = _blurViews[e][k];
      if (!edgeActive) {
        // Hidden effect views trigger no backdrop pass — free.
        view.hidden = YES;
        continue;
      }
      view.hidden = NO;

      // Inner padding for this level: p_k = _blurRadius·F[k], clamped so the
      // strip never exceeds the view. Feeds the backdrop sampler across the
      // strip's inner seam; the mask weight is 0 throughout the padding.
      const CGFloat pad = _blurRadius * kEdgeFadeLevelFractions[k];
      CGRect frame;
      switch (e) {
        case OneNativeEdgeFadeEdgeTop:
          frame = CGRectMake(0, 0, w, MIN(h, _fadeTop + pad));
          break;
        case OneNativeEdgeFadeEdgeBottom: {
          const CGFloat stripH = MIN(h, _fadeBottom + pad);
          frame = CGRectMake(0, MAX(0, h - _fadeBottom - pad), w, stripH);
          break;
        }
        case OneNativeEdgeFadeEdgeLeft:
          frame = CGRectMake(0, 0, MIN(w, _fadeLeft + pad), h);
          break;
        case OneNativeEdgeFadeEdgeRight: {
          const CGFloat stripW = MIN(w, _fadeRight + pad);
          frame = CGRectMake(MAX(0, w - _fadeRight - pad), 0, stripW, h);
          break;
        }
        default:
          frame = self.bounds;
          break;
      }
      view.frame                  = frame;
      _blurMaskLayers[e][k].frame = view.bounds;
    }
  }

  // Saturation-compensation layers: same geometry as the veil strips.
  if (_satTop) {
    _satTop.frame      = CGRectMake(0, 0, w, _fadeTop);
    _satTop.startPoint = CGPointMake(0.5, 1); _satTop.endPoint = CGPointMake(0.5, 0);
    _satTop.hidden     = (_fadeTop <= 0);

    _satBottom.frame      = CGRectMake(0, h - _fadeBottom, w, _fadeBottom);
    _satBottom.startPoint = CGPointMake(0.5, 0); _satBottom.endPoint = CGPointMake(0.5, 1);
    _satBottom.hidden     = (_fadeBottom <= 0);

    _satLeft.frame      = CGRectMake(0, 0, _fadeLeft, h);
    _satLeft.startPoint = CGPointMake(1, 0.5); _satLeft.endPoint = CGPointMake(0, 0.5);
    _satLeft.hidden     = (_fadeLeft <= 0);

    _satRight.frame      = CGRectMake(w - _fadeRight, 0, _fadeRight, h);
    _satRight.startPoint = CGPointMake(0, 0.5); _satRight.endPoint = CGPointMake(1, 0.5);
    _satRight.hidden     = (_fadeRight <= 0);
  }

  // Frost veil layers.
  if (_frostTop) {
    _frostTop.frame      = CGRectMake(0, 0, w, _fadeTop);
    _frostTop.startPoint = CGPointMake(0.5, 1); _frostTop.endPoint = CGPointMake(0.5, 0);
    _frostTop.hidden     = (_fadeTop <= 0);

    _frostBottom.frame      = CGRectMake(0, h - _fadeBottom, w, _fadeBottom);
    _frostBottom.startPoint = CGPointMake(0.5, 0); _frostBottom.endPoint = CGPointMake(0.5, 1);
    _frostBottom.hidden     = (_fadeBottom <= 0);

    _frostLeft.frame      = CGRectMake(0, 0, _fadeLeft, h);
    _frostLeft.startPoint = CGPointMake(1, 0.5); _frostLeft.endPoint = CGPointMake(0, 0.5);
    _frostLeft.hidden     = (_fadeLeft <= 0);

    _frostRight.frame      = CGRectMake(w - _fadeRight, 0, _fadeRight, h);
    _frostRight.startPoint = CGPointMake(0, 0.5); _frostRight.endPoint = CGPointMake(1, 0.5);
    _frostRight.hidden     = (_fadeRight <= 0);
  }

  [CATransaction commit];
}

@end
