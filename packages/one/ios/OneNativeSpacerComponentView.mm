#import "OneNativeSpacerComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import "OneNativeContainerStyle.h"
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
    __weak OneNativeSpacerComponentView *weakSelf = self;
    _spacerView.onSwiftStyleEvent = ^(NSString *name, NSString *value) {
      OneNativeSpacerComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeSpacerEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeSDKEvent({.name = std::string(name.UTF8String), .value = std::string(value.UTF8String)});
    };
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeSpacerProps>(props);
  [_spacerView configureSwiftStyle:OneNativeStyleDictionary(next.swiftStyle)];
  [_spacerView configureWithMinLength:next.minLength];
  [super updateProps:props oldProps:oldProps];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  [_spacerView reset];
}

@end
