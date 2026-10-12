#import "OneNativeKeyframeAnimatorComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeKeyframeAnimatorComponentView {
  OneNativeKeyframeAnimatorView *_animator;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeKeyframeAnimatorComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeKeyframeAnimatorProps>();
    _animator = [OneNativeKeyframeAnimatorView new];
    self.container = _animator;
    self.contentView = _animator;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeKeyframeAnimatorProps>(props);
  [_animator configureWithAnimatorId:next.animatorId initialValue:RCTNSStringFromString(next.initialValue) tracks:RCTNSStringFromString(next.tracks) repeating:next.repeating hasTrigger:next.hasTrigger trigger:next.trigger];
  [super updateProps:props oldProps:oldProps];
}

@end
