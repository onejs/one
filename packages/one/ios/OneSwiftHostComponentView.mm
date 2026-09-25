#import "OneSwiftHostComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import "OneSwiftHostShadowNode.h"
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneSwiftHostComponentView {
  OneSwiftHostView *_hostView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneSwiftHostComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneSwiftHostProps>();
    _hostView = [OneSwiftHostView new];
    self.container = _hostView;
    self.contentView = _hostView;
    __weak OneSwiftHostComponentView *weakSelf = self;
    _hostView.onMeasure = ^(CGFloat height) {
      [weakSelf updateMeasuredHeight:height];
    };
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneSwiftHostProps>(props);
  [_hostView configureWithPackageName:RCTNSStringFromString(next.packageName)
                                props:RCTNSStringFromString(next.props)
                                 fill:next.fill];
  [super updateProps:props oldProps:oldProps];
}

@end
