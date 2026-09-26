#import "OneNativeLazyHGridComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeLazyHGridComponentView {
  OneNativeLazyHGridView *_gridView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeLazyHGridComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeLazyHGridProps>();
    _gridView = [OneNativeLazyHGridView new];
    self.container = _gridView;
    self.contentView = _gridView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeLazyHGridProps>(props);
  [_gridView configureWithRows:RCTNSStringFromString(next.rows)
                                          alignment:RCTNSStringFromString(next.alignment)
                                          spacing:RCTNSStringFromString(next.spacing)];
  [super updateProps:props oldProps:oldProps];
}

@end
