#import "OneNativeButtonComponentView.h"
#import <React/RCTView.h>
#import "VxrnNative-Swift.h"
#import "OneNativeButtonShadowNode.h"
#import <React/RCTConversions.h>
#import "OneNativeStyleDictionary.h"

using namespace facebook::react;

@implementation OneNativeButtonComponentView {
  OneNativeButtonView *_buttonView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeButtonComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeButtonProps>();
    _buttonView = [OneNativeButtonView new];
    self.container = _buttonView;
    self.contentView = _buttonView;
    __weak OneNativeButtonComponentView *weakSelf = self;
    _buttonView.onMeasure = ^(CGFloat height) {
      [weakSelf updateMeasuredHeight:height];
    };
    _buttonView.onPress = ^(NSInteger pressCount) {
      OneNativeButtonComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeButtonEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeButtonPress({.eventCount = (int)pressCount});
    };
    _buttonView.onSDKEvent = ^(NSString *name, NSString *value) {
      OneNativeButtonComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeButtonEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeSDKEvent({.name = std::string(name.UTF8String), .value = std::string(value.UTF8String)});
    };
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeButtonProps>(props);
  [_buttonView configureAccessibility:RCTNSStringFromString(next.accessibilityLabel)
    hint:RCTNSStringFromString(next.accessibilityHint)
    value:RCTNSStringFromString(next.accessibilityValue.text.value_or(""))
    identifier:RCTNSStringFromString(next.testId)];
  [_buttonView configureStyle:OneNativeStyleDictionary(next.swiftStyle)];
  [_buttonView configureWithLabel:RCTNSStringFromString(next.label)
    disabled:next.disabled
    subtitle:RCTNSStringFromString(next.subtitle)
    systemImage:RCTNSStringFromString(next.systemImage)
    buttonRole:RCTNSStringFromString(next.buttonRole)
    buttonStyle:RCTNSStringFromString(next.buttonStyle)
    disclosureIndicator:next.disclosureIndicator];
  [super updateProps:props oldProps:oldProps];
}

@end
