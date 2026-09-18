#import "OneNativeLazyVStackComponentView.h"
#import <React/RCTView.h>
#import "VxrnNative-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeLazyVStackComponentView {
  OneNativeLazyVStackView *_stackView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeLazyVStackComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeLazyVStackProps>();
    _stackView = [OneNativeLazyVStackView new];
    self.container = _stackView;
    self.contentView = _stackView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeLazyVStackProps>(props);
  [_stackView configureWithAlignment:RCTNSStringFromString(next.alignment)];
  [super updateProps:props oldProps:oldProps];
}

@end
