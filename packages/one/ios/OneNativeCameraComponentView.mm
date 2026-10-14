#import "OneNativeCameraComponentView.h"
#import <React/RCTConversions.h>
#import "One-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <react/renderer/components/OneNativeSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

@interface OneNativeCameraComponentView () <RCTOneNativeCameraViewProtocol>
@end

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
    _nativeView.onPicture = ^(NSInteger requestId, NSString *uri, NSInteger width,
                              NSInteger height, NSString *base64, NSString *error) {
      OneNativeCameraComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeCameraEventEmitter>(
          strongSelf->_eventEmitter);
      emitter->onNativeCameraPicture({.requestId = static_cast<int>(requestId),
                                      .uri = std::string(uri.UTF8String),
                                      .width = static_cast<int>(width),
                                      .height = static_cast<int>(height),
                                      .base64 = std::string(base64.UTF8String),
                                      .error = std::string(error.UTF8String)});
    };
  }
  return self;
}

- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args {
  RCTOneNativeCameraHandleCommand(self, commandName, args);
}

- (void)takePicture:(NSInteger)requestId quality:(double)quality base64:(BOOL)base64 {
  [_nativeView takePicture:requestId quality:quality base64:base64];
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeCameraProps>(props);
  NSMutableArray<NSString *> *types = [NSMutableArray arrayWithCapacity:next.codeTypes.size()];
  for (const auto &type : next.codeTypes) [types addObject:RCTNSStringFromString(type)];
  [_nativeView configure:next.active
                  facing:RCTNSStringFromString(next.facing)
               codeTypes:types];
  [_nativeView configureCapture:RCTNSStringFromString(next.flash)
                          torch:next.enableTorch
                           zoom:next.zoom];
  [super updateProps:props oldProps:oldProps];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  [_nativeView reset];
}

@end
