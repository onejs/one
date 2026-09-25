#import "OneNativeControlGroupComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeControlGroupComponentView {
  OneNativeControlGroupView *_groupView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeControlGroupComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeControlGroupProps>();
    _groupView = [OneNativeControlGroupView new];
    self.container = _groupView;
    self.contentView = _groupView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeControlGroupProps>(props);
  [_groupView configureWithLabel:RCTNSStringFromString(next.label)
                     systemImage:RCTNSStringFromString(next.systemImage)
              controlGroupStyle:RCTNSStringFromString(next.controlGroupStyle)];
  [super updateProps:props oldProps:oldProps];
}

@end
