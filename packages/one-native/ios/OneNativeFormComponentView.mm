#import "OneNativeFormComponentView.h"
#import "OneNative-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>

using namespace facebook::react;

@implementation OneNativeFormComponentView

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeFormComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeFormProps>();
    OneNativeFormView *formView = [OneNativeFormView new];
    self.container = formView;
    self.contentView = formView;
  }
  return self;
}

@end
