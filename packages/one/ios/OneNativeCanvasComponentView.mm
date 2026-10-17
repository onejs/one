#import "OneNativeCanvasComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import "OneNativeContainerStyle.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeCanvasComponentView {
  OneNativeCanvasView *_canvas;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeCanvasComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeCanvasProps>();
    _canvas = [OneNativeCanvasView new];
    self.container = _canvas;
    OneNativeForwardSwiftStyleEvents<OneNativeCanvasEventEmitter>(self);
    self.contentView = _canvas;
    __weak OneNativeCanvasComponentView *weakSelf = self;
    _canvas.onSize = ^(CGFloat width, CGFloat height) {
      OneNativeCanvasComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeCanvasEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeCanvasSizeChange({.width = width, .height = height});
    };
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeCanvasProps>(props);
  [_canvas configureSwiftStyle:OneNativeStyleDictionary(next.swiftStyle)];
  [_canvas configureWithOps:RCTNSStringFromString(next.ops)
                     opaque:next.opaque
                  colorMode:RCTNSStringFromString(next.colorMode)
      rendersAsynchronously:next.rendersAsynchronously];
  [super updateProps:props oldProps:oldProps];
}

@end
