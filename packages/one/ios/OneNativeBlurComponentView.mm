#import "OneNativeBlurComponentView.h"
#import "One-Swift.h"

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
  OneNativeBlurEffectView *_blurView;
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
    _blurView = [[OneNativeBlurEffectView alloc] init];
    _blurView.userInteractionEnabled = NO;
    _blurView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    _blurView.frame = self.bounds;
    [self addSubview:_blurView];
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &p  = *std::static_pointer_cast<OneNativeBlurProps const>(props);
  NSString *tint = [NSString stringWithUTF8String:p.tint.c_str()];
  const CGFloat intensity = MIN(MAX((CGFloat)p.intensity, 0.0), 1.0);
  const BOOL tintChanged = ![tint isEqualToString:_tint];
  const BOOL intensityChanged = intensity != _intensity;

  _tint = tint;
  _intensity = intensity;

  if (tintChanged || intensityChanged) {
    [_blurView updateBlurWithStyle:blurStyleForTint(tint) intensity:intensity];
  }

  [super updateProps:props oldProps:oldProps];
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
