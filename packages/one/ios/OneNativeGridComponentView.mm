#import "OneNativeGridComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeGridComponentView {
  OneNativeGridView *_gridView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeGridComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeGridProps>();
    _gridView = [OneNativeGridView new];
    self.container = _gridView;
    self.contentView = _gridView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeGridProps>(props);
  [_gridView configureWithAlignment:RCTNSStringFromString(next.alignment)
                                          horizontalSpacing:RCTNSStringFromString(next.horizontalSpacing)
                                          verticalSpacing:RCTNSStringFromString(next.verticalSpacing)];
  [super updateProps:props oldProps:oldProps];
}

@end
