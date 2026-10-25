#import "OneDOMHostComponentView.h"
#import <React/RCTConversions.h>
#import "One-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <react/renderer/components/OneNativeSpec/Props.h>
#import <react/renderer/components/OneNativeSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

@interface OneDOMHostComponentView () <RCTOneDOMHostViewProtocol>
@end

// fabric glue only; OneDOMHostView owns the web view and its documents.
@implementation OneDOMHostComponentView {
  OneDOMHostView *_host;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneDOMHostComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneDOMHostProps>();
    _host = [OneDOMHostView new];
    self.contentView = _host;
    __weak OneDOMHostComponentView *weakSelf = self;
    _host.onDocumentStart = ^(NSString *epoch, double revision) {
      if (auto emitter = [weakSelf emitter])
        emitter->onDocumentStart({.epoch = std::string(epoch.UTF8String), .revision = revision});
    };
    _host.onMessage = ^(NSString *message) {
      if (auto emitter = [weakSelf emitter])
        emitter->onMessage({.message = std::string(message.UTF8String)});
    };
    _host.onLoad = ^(NSString *epoch) {
      if (auto emitter = [weakSelf emitter]) emitter->onLoad({.epoch = std::string(epoch.UTF8String)});
    };
    _host.onError = ^(NSString *epoch, NSString *message, NSString *code) {
      if (auto emitter = [weakSelf emitter])
        emitter->onError({.epoch = std::string(epoch.UTF8String),
                          .message = std::string(message.UTF8String),
                          .code = std::string(code.UTF8String)});
    };
    _host.onProcessTerminated = ^(NSString *epoch) {
      if (auto emitter = [weakSelf emitter])
        emitter->onProcessTerminated({.epoch = std::string(epoch.UTF8String)});
    };
  }
  return self;
}

- (std::shared_ptr<const OneDOMHostEventEmitter>)emitter {
  return std::static_pointer_cast<const OneDOMHostEventEmitter>(_eventEmitter);
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneDOMHostProps>(props);
  [_host configureWithEntryId:RCTNSStringFromString(next.entryId)
               developmentURL:RCTNSStringFromString(next.developmentURL)
               bootstrapState:RCTNSStringFromString(next.bootstrapState)
                scrollEnabled:next.scrollEnabled];
  [super updateProps:props oldProps:oldProps];
}

- (void)finalizeUpdates:(RNComponentViewUpdateMask)updateMask {
  [super finalizeUpdates:updateMask];
  [_host mount];
}

- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args {
  RCTOneDOMHostHandleCommand(self, commandName, args);
}

- (void)post:(NSString *)message {
  [_host post:message];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  [_host teardown];
}

@end
