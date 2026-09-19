// vendored from react-native-edge-fade (MIT, Copyright (c) 2026 Giulio Amato),
// trimmed to the mask path for OneNativeEdgeFade. see VENDORING.md.
#import "OneNativeEdgeFadeComponentView.h"
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

// mask-mode edge fade: a single DestinationIn mask layer over the whole
// bounds. there is deliberately no content view: in RCTViewComponentView
// children mount into the component view itself, and the mask must sit on
// self.layer to fade them. overlay mode never reaches this view (RN core
// gradients paint it in JS); blur mode arrives in slice 2.
@implementation OneNativeEdgeFadeComponentView {
  OneNativeEdgeFadeMaskLayer *_maskLayer;

  CGFloat   _fadeTop, _fadeBottom, _fadeLeft, _fadeRight;
  NSString *_curveTop, *_curveBottom, *_curveLeft, *_curveRight;
  CGFloat   _fadeRadius;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeEdgeFadeComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const OneNativeEdgeFadeProps>();
    _props = defaultProps;
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
  const BOOL radiusChanged = p.fadeRadius != op.fadeRadius;

  _fadeTop    = (CGFloat)p.fadeTop;    _fadeBottom = (CGFloat)p.fadeBottom;
  _fadeLeft   = (CGFloat)p.fadeLeft;   _fadeRight  = (CGFloat)p.fadeRight;
  _curveTop    = [NSString stringWithUTF8String:p.curveTop.c_str()];
  _curveBottom = [NSString stringWithUTF8String:p.curveBottom.c_str()];
  _curveLeft   = [NSString stringWithUTF8String:p.curveLeft.c_str()];
  _curveRight  = [NSString stringWithUTF8String:p.curveRight.c_str()];

  // Build the mask layer on first props (defaults don't trigger a change when
  // the user picks zero fades), then sync incrementally.
  if (!_maskLayer) {
    _maskLayer = [OneNativeEdgeFadeMaskLayer layer];
    _maskLayer.contentsScale = [self _effectiveScale];
    _maskLayer.frame = self.bounds;
    self.layer.mask = _maskLayer;
    [self _syncMaskLayer];
  } else if (sizeChanged || curveChanged) {
    [self _syncMaskLayer];
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
  if (_maskLayer) {
    // needsDisplayOnBoundsChange is YES — CA invalidates on bounds change
    // automatically. No explicit setNeedsDisplay needed for origin-only frame
    // shifts (the rendered bitmap is in layer-local coordinates).
    _maskLayer.frame = self.bounds;
    // heal the mask if core's clipping pipeline cleared it without running
    // our invalidateLayer override (renamed selector on a future RN).
    if (self.layer.mask != _maskLayer) {
      self.layer.mask = _maskLayer;
    }
  }
}

// RCTViewComponentView.invalidateLayer resets the layer mask to nil during its
// border/clipping pipeline. Re-apply our mask after super has finished,
// otherwise mask mode never paints.
- (void)invalidateLayer {
  [super invalidateLayer];
  if (_maskLayer && self.layer.mask != _maskLayer) {
    self.layer.mask = _maskLayer;
  }
}

// ─── Mask sync ───────────────────────────────────────────────────────────────

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

@end
