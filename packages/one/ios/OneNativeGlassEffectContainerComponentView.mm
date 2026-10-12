#import "OneNativeGlassEffectContainerComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import "OneNativeGlassEffectContainerShadowNode.h"

using namespace facebook::react;

@implementation OneNativeGlassEffectContainerComponentView {
  OneNativeGlassEffectContainerView *_glassEffectContainer;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeGlassEffectContainerComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeGlassEffectContainerProps>();
    _glassEffectContainer = [OneNativeGlassEffectContainerView new];
    self.container = _glassEffectContainer;
    self.contentView = _glassEffectContainer;
    __weak OneNativeGlassEffectContainerComponentView *weakSelf = self;
    _glassEffectContainer.onMeasure = ^(CGFloat height) {
      [weakSelf updateMeasuredHeight:height];
    };
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeGlassEffectContainerProps>(props);
  [_glassEffectContainer configureWithSpacing:next.spacing hasSpacing:next.hasSpacing];
  [super updateProps:props oldProps:oldProps];
}

@end
