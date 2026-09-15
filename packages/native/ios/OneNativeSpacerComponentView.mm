#import "OneNativeSpacerComponentView.h"
#import <React/RCTView.h>
#import "VxrnNative-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>

using namespace facebook::react;

@implementation OneNativeSpacerComponentView {
  OneNativeSpacerView *_spacerView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeSpacerComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeSpacerProps>();
    _spacerView = [OneNativeSpacerView new];
    self.contentView = _spacerView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeSpacerProps>(props);
  [_spacerView configureWithMinLength:next.minLength];
  [super updateProps:props oldProps:oldProps];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  [_spacerView reset];
}

@end
