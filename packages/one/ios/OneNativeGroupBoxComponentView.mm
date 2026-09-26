#import "OneNativeGroupBoxComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import "OneNativeGroupBoxShadowNode.h"
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeGroupBoxComponentView {
  OneNativeGroupBoxView *_groupBox;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeGroupBoxComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeGroupBoxProps>();
    _groupBox = [OneNativeGroupBoxView new];
    self.container = _groupBox;
    self.contentView = _groupBox;
    __weak OneNativeGroupBoxComponentView *weakSelf = self;
    _groupBox.onMeasure = ^(CGFloat height) {
      [weakSelf updateMeasuredHeight:height];
    };
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeGroupBoxProps>(props);
  [_groupBox configureWithLabel:RCTNSStringFromString(next.label)];
  [super updateProps:props oldProps:oldProps];
}

@end
