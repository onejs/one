#import "OneNativeZStackComponentView.h"
#import <React/RCTView.h>
#import "VxrnNative-Swift.h"
#import "OneNativeZStackShadowNode.h"
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeZStackComponentView {
  OneNativeZStackView *_zStackView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeZStackComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeZStackProps>();
    _zStackView = [OneNativeZStackView new];
    self.container = _zStackView;
    self.contentView = _zStackView;
    __weak OneNativeZStackComponentView *weakSelf = self;
    _zStackView.onMeasure = ^(CGFloat height) {
      [weakSelf updateMeasuredHeight:height];
    };
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeZStackProps>(props);
  [_zStackView configureWithAlignment:RCTNSStringFromString(next.alignment)];
  [super updateProps:props oldProps:oldProps];
}

@end
