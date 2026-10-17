#import "OneNativeDividerComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import "OneNativeContainerStyle.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>

using namespace facebook::react;

@implementation OneNativeDividerComponentView {
  OneNativeDividerView *_dividerView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeDividerComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeDividerProps>();
    _dividerView = [OneNativeDividerView new];
    self.contentView = _dividerView;
    __weak OneNativeDividerComponentView *weakSelf = self;
    _dividerView.onSwiftStyleEvent = ^(NSString *name, NSString *value) {
      OneNativeDividerComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeDividerEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeSDKEvent({.name = std::string(name.UTF8String), .value = std::string(value.UTF8String)});
    };
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeDividerProps>(props);
  [_dividerView configureSwiftStyle:OneNativeStyleDictionary(next.swiftStyle)];
  [super updateProps:props oldProps:oldProps];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  [_dividerView reset];
}

@end
