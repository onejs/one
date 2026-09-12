#import "OneNativeFormComponentView.h"
#import "OneNative-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeFormComponentView
{
  OneNativeFormView *_formView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeFormComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeFormProps>();
    _formView = [OneNativeFormView new];
    self.container = _formView;
    self.contentView = _formView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeFormProps>(props);
  [_formView configureEnvironmentWithColorScheme:RCTNSStringFromString(next.colorScheme)
                                 dynamicTypeSize:RCTNSStringFromString(next.dynamicTypeSize)
                                          locale:RCTNSStringFromString(next.locale)
                                            tint:next.tint ? RCTUIColorFromSharedColor(next.tint) : nil
                                       isEnabled:RCTNSStringFromString(next.isEnabled)];
  [super updateProps:props oldProps:oldProps];
}

@end
