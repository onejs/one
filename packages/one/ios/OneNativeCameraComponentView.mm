#import "OneNativeCameraComponentView.h"
#import <React/RCTConversions.h>
#import "One-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>

using namespace facebook::react;

@implementation OneNativeCameraComponentView {
  OneNativeCameraView *_nativeView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeCameraComponentDescriptor>();
}

- (NSObject *)accessibilityElement { return _nativeView; }

- (void)updateEventEmitter:(EventEmitter::Shared const &)eventEmitter {
  [super updateEventEmitter:eventEmitter];
  [_nativeView replayState];
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeCameraProps>();
    _nativeView = [OneNativeCameraView new];
    self.contentView = _nativeView;
    __weak OneNativeCameraComponentView *weakSelf = self;
    _nativeView.onStateChange = ^(NSString *state) {
      OneNativeCameraComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeCameraEventEmitter>(
          strongSelf->_eventEmitter);
      emitter->onNativeCameraState({.state = std::string(state.UTF8String)});
    };
    _nativeView.onCodeScanned = ^(NSString *type, NSString *data) {
      OneNativeCameraComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeCameraEventEmitter>(
          strongSelf->_eventEmitter);
      emitter->onNativeCameraCode({.type = std::string(type.UTF8String),
                                   .data = std::string(data.UTF8String)});
    };
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeCameraProps>(props);
  NSMutableArray<NSString *> *types = [NSMutableArray arrayWithCapacity:next.codeTypes.size()];
  for (const auto &type : next.codeTypes) [types addObject:RCTNSStringFromString(type)];
  [_nativeView configure:next.active
                  facing:RCTNSStringFromString(next.facing)
               codeTypes:types];
  [super updateProps:props oldProps:oldProps];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  [_nativeView reset];
}

@end
