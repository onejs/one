#import "OneNativeUIKitHostComponentView.h"
#import "One-Swift.h"
#import <React/RCTConversions.h>
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

@interface OneNativeUIKitHostComponentView () <RCTOneNativeUIKitHostViewProtocol>
@end

@implementation OneNativeUIKitHostComponentView {
  OneNativeUIKitHostView *_nativeView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeUIKitHostComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeUIKitHostProps>();
    _nativeView = [OneNativeUIKitHostView new];
    self.contentView = _nativeView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeUIKitHostProps>(props);
  [_nativeView configureAccessibility:RCTNSStringFromString(next.accessibilityLabel)
    hint:RCTNSStringFromString(next.accessibilityHint)
    value:RCTNSStringFromString(next.accessibilityValue.text.value_or(""))
    identifier:RCTNSStringFromString(next.testId)];
  [_nativeView configureWithViewId:next.viewId];
  [super updateProps:props oldProps:oldProps];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  [_nativeView reset];
}

@end
