#import "OneNativeHostComponentView.h"
#import "OneNative-Swift.h"
#import "OneNativeHostShadowNode.h"
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeHostComponentView {
  OneNativeHostView *_hostView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeHostComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeHostProps>();
    _hostView = [OneNativeHostView new];
    self.container = _hostView;
    self.contentView = _hostView;
    __weak OneNativeHostComponentView *weakSelf = self;
    _hostView.onMeasure = ^(CGFloat height) {
      [weakSelf updateMeasuredHeight:height];
    };
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeHostProps>(props);
  [_hostView configureWithAxis:RCTNSStringFromString(next.axis)
                       spacing:next.spacing
                     alignment:RCTNSStringFromString(next.alignment)];
  [super updateProps:props oldProps:oldProps];
}

@end
