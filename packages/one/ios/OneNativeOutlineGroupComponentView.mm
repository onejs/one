#import "OneNativeOutlineGroupComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import "OneNativeContainerStyle.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeOutlineGroupComponentView {
  OneNativeOutlineGroupView *_outline;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeOutlineGroupComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeOutlineGroupProps>();
    _outline = [OneNativeOutlineGroupView new];
    self.container = _outline;
    OneNativeForwardSwiftStyleEvents<OneNativeOutlineGroupEventEmitter>(self);
    self.contentView = _outline;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeOutlineGroupProps>(props);
  [_outline configureSwiftStyle:OneNativeStyleDictionary(next.swiftStyle)];
  [_outline configureWithTree:RCTNSStringFromString(next.tree)];
  [super updateProps:props oldProps:oldProps];
}

@end
