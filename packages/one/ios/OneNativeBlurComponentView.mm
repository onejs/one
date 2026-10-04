#import "OneNativeBlurComponentView.h"
#import "One-Swift.h"

#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/Props.h>
#import <react/renderer/components/OneNativeSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

// Regular backdrop blur (UI.Blur, expo-blur compatible). A single
// OneNativeBlurEffectView (vendored from @sbaiahmed1/react-native-blur) fills
// the bounds behind the children and owns the intensity animator. Children
// mount as siblings above the effect view and stay sharp.
@implementation OneNativeBlurComponentView {
  OneNativeBlurEffectView *_blurView;
  BOOL _configured;
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
    self.clipsToBounds = YES;
    _blurView = [OneNativeBlurEffectView new];
    _blurView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    _blurView.frame = self.bounds;
    [self addSubview:_blurView];
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &p  = *std::static_pointer_cast<OneNativeBlurProps const>(props);
  const auto &op = *std::static_pointer_cast<OneNativeBlurProps const>(_props);
  // each update rebuilds the animator, so skip transactions that leave the
  // blur unchanged.
  if (!_configured || p.tint != op.tint || p.intensity != op.intensity) {
    _configured = YES;
    NSString *tint = [NSString stringWithUTF8String:p.tint.c_str()];
    [_blurView updateBlurWithStyle:blurStyleForTint(tint) intensity:MIN(MAX(p.intensity, 0.0), 1.0)];
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
