#import "OneNativeViewThatFitsComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import "OneNativeViewThatFitsShadowNode.h"
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeViewThatFitsComponentView {
  OneNativeViewThatFitsView *_viewThatFits;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeViewThatFitsComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeViewThatFitsProps>();
    _viewThatFits = [OneNativeViewThatFitsView new];
    self.container = _viewThatFits;
    self.contentView = _viewThatFits;
    __weak OneNativeViewThatFitsComponentView *weakSelf = self;
    _viewThatFits.onMeasure = ^(CGFloat height) {
      [weakSelf updateMeasuredHeight:height];
    };
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeViewThatFitsProps>(props);
  const auto height = next.yogaStyle.dimension(facebook::yoga::Dimension::Height);
  const bool boundedHeight = !height.isUndefined() && !height.isAuto();
  [_viewThatFits configureWithAxes:RCTNSStringFromString(next.axes) boundedHeight:boundedHeight];
  [super updateProps:props oldProps:oldProps];
}

@end
