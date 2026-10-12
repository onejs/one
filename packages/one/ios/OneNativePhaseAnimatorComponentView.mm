#import "OneNativePhaseAnimatorComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativePhaseAnimatorComponentView {
  OneNativePhaseAnimatorView *_animator;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativePhaseAnimatorComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativePhaseAnimatorProps>();
    _animator = [OneNativePhaseAnimatorView new];
    self.container = _animator;
    self.contentView = _animator;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativePhaseAnimatorProps>(props);
  [_animator configureWithAnimatorId:next.animatorId animations:RCTNSStringFromString(next.animations) hasTrigger:next.hasTrigger trigger:next.trigger];
  [super updateProps:props oldProps:oldProps];
}

@end
