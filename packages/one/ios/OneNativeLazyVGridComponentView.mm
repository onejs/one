#import "OneNativeLazyVGridComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeLazyVGridComponentView {
  OneNativeLazyVGridView *_gridView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeLazyVGridComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeLazyVGridProps>();
    _gridView = [OneNativeLazyVGridView new];
    self.container = _gridView;
    self.contentView = _gridView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeLazyVGridProps>(props);
  [_gridView configureWithColumns:RCTNSStringFromString(next.columns)
                                          alignment:RCTNSStringFromString(next.alignment)
                                          spacing:RCTNSStringFromString(next.spacing)];
  [super updateProps:props oldProps:oldProps];
}

@end
