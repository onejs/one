#import "OneNativeBlurComponentView.h"

#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/Props.h>
#import <react/renderer/components/OneNativeSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

// Regular backdrop blur (UI.Blur, expo-blur compatible). A single
// UIVisualEffectView fills the bounds behind the children; intensity runs
// through a paused animator's fractionComplete (the standard trick —
// UIVisualEffectView has no intensity API). Children mount as siblings
// above the effect view and stay sharp.
@implementation OneNativeBlurComponentView {
  UIVisualEffectView *_blurView;
  UIViewPropertyAnimator *_animator;
  UIBlurEffect *_effect;
  NSString *_tint;
  CGFloat _intensity;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeBlurComponentDescriptor>();
}

// expo-blur tint names to UIBlurEffect styles. `default` is `regular`,
// matching expo; unknown names fall back to `regular` rather than
// rendering nothing.
static UIBlurEffectStyle blurStyleForTint(NSString *tint) {
  static NSDictionary<NSString *, NSNumber *> *map;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    map = @{
      @"extraLight": @(UIBlurEffectStyleExtraLight),
      @"light": @(UIBlurEffectStyleLight),
      @"dark": @(UIBlurEffectStyleDark),
      @"regular": @(UIBlurEffectStyleRegular),
      @"prominent": @(UIBlurEffectStyleProminent),
      @"systemUltraThinMaterial": @(UIBlurEffectStyleSystemUltraThinMaterial),
      @"systemThinMaterial": @(UIBlurEffectStyleSystemThinMaterial),
      @"systemMaterial": @(UIBlurEffectStyleSystemMaterial),
      @"systemThickMaterial": @(UIBlurEffectStyleSystemThickMaterial),
      @"systemChromeMaterial": @(UIBlurEffectStyleSystemChromeMaterial),
      @"systemUltraThinMaterialLight": @(UIBlurEffectStyleSystemUltraThinMaterialLight),
      @"systemThinMaterialLight": @(UIBlurEffectStyleSystemThinMaterialLight),
      @"systemMaterialLight": @(UIBlurEffectStyleSystemMaterialLight),
      @"systemThickMaterialLight": @(UIBlurEffectStyleSystemThickMaterialLight),
      @"systemChromeMaterialLight": @(UIBlurEffectStyleSystemChromeMaterialLight),
      @"systemUltraThinMaterialDark": @(UIBlurEffectStyleSystemUltraThinMaterialDark),
      @"systemThinMaterialDark": @(UIBlurEffectStyleSystemThinMaterialDark),
      @"systemMaterialDark": @(UIBlurEffectStyleSystemMaterialDark),
      @"systemThickMaterialDark": @(UIBlurEffectStyleSystemThickMaterialDark),
      @"systemChromeMaterialDark": @(UIBlurEffectStyleSystemChromeMaterialDark),
    };
  });
  NSNumber *style = map[tint];
  return style ? (UIBlurEffectStyle)style.integerValue : UIBlurEffectStyleRegular;
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const OneNativeBlurProps>();
    _props = defaultProps;
    _intensity = 0.5;
    self.clipsToBounds = YES;
    _blurView = [[UIVisualEffectView alloc] initWithEffect:nil];
    _blurView.userInteractionEnabled = NO;
    _blurView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    _blurView.frame = self.bounds;
    [self addSubview:_blurView];
  }
  return self;
}

- (void)dealloc {
  [self _neutralizeAnimator];
}

// A UIViewPropertyAnimator deallocated while active/paused raises. The legal
// teardown is stopAnimation:NO then finishAnimationAtPosition:; an
// `.inactive` animator needs neither call.
- (void)_neutralizeAnimator {
  if (_animator != nil) {
    if (_animator.state == UIViewAnimatingStateActive) {
      [_animator stopAnimation:NO];
    }
    if (_animator.state == UIViewAnimatingStateStopped) {
      [_animator finishAnimationAtPosition:UIViewAnimatingPositionCurrent];
    }
    _animator = nil;
  }
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &p  = *std::static_pointer_cast<OneNativeBlurProps const>(props);
  const auto &op = *std::static_pointer_cast<OneNativeBlurProps const>(_props);

  NSString *tint = [NSString stringWithUTF8String:p.tint.c_str()];
  const CGFloat intensity = MIN(MAX((CGFloat)p.intensity, 0.0), 1.0);
  const BOOL tintChanged = ![tint isEqualToString:_tint] || _effect == nil;
  const BOOL intensityChanged = intensity != _intensity;

  _tint = tint;
  _intensity = intensity;

  if (tintChanged) {
    _effect = [UIBlurEffect effectWithStyle:blurStyleForTint(tint)];
    [self _neutralizeAnimator];
    [self _runAnimator];
  } else if (intensityChanged) {
    if (_animator && _animator.state != UIViewAnimatingStateInactive) {
      _animator.fractionComplete = (CGFloat)_intensity;
    } else if (_intensity > 0) {
      [self _runAnimator];
    }
  }

  [super updateProps:props oldProps:oldProps];
}

// (Re)build the paused animator driving effectView.effect, scrubbed to the
// current intensity. Intensity 0 leaves the effect nil (sharp passthrough).
- (void)_runAnimator {
  if (_intensity <= 0 || _effect == nil) {
    _blurView.effect = nil;
    return;
  }
  __weak UIVisualEffectView *weakView = _blurView;
  UIBlurEffect *effect = _effect;
  _animator = [[UIViewPropertyAnimator alloc] initWithDuration:1
                                                         curve:UIViewAnimationCurveLinear
                                                    animations:^{
    weakView.effect = effect;
  }];
  _animator.pausesOnCompletion = YES;
  [_animator startAnimation];
  [_animator pauseAnimation];
  _animator.fractionComplete = (CGFloat)_intensity;
}

- (void)didAddSubview:(UIView *)subview {
  [super didAddSubview:subview];
  // Children mount after the effect view and stay above it; if anything ever
  // inserts below (recycled view), push the blur back down.
  if (subview != _blurView) {
    [self sendSubviewToBack:_blurView];
  }
}

- (void)layoutSubviews {
  [super layoutSubviews];
  _blurView.frame = self.bounds;
}

@end
