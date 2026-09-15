#import "OneNativeLabeledContentComponentView.h"
#import <React/RCTView.h>
#import "VxrnNative-Swift.h"
#import "OneNativeLabeledContentShadowNode.h"
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeLabeledContentComponentView {
  OneNativeLabeledContentView *_labeledContent;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeLabeledContentComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeLabeledContentProps>();
    _labeledContent = [OneNativeLabeledContentView new];
    self.container = _labeledContent;
    self.contentView = _labeledContent;
    __weak OneNativeLabeledContentComponentView *weakSelf = self;
    _labeledContent.onMeasure = ^(CGFloat height) {
      [weakSelf updateMeasuredHeight:height];
    };
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeLabeledContentProps>(props);
  [_labeledContent configureWithLabel:RCTNSStringFromString(next.label)
                                value:RCTNSStringFromString(next.value)
                          systemImage:RCTNSStringFromString(next.systemImage)];
  [super updateProps:props oldProps:oldProps];
}

@end
