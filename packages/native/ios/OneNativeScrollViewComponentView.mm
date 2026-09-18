#import "OneNativeScrollViewComponentView.h"
#import <React/RCTView.h>
#import "VxrnNative-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeScrollViewComponentView {
  OneNativeScrollViewView *_scrollView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeScrollViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeScrollViewProps>();
    _scrollView = [OneNativeScrollViewView new];
    self.container = _scrollView;
    self.contentView = _scrollView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeScrollViewProps>(props);
  [_scrollView configureWithAxes:RCTNSStringFromString(next.axes)
                showsIndicators:next.showsIndicators];
  [super updateProps:props oldProps:oldProps];
}

@end
