#import "OneNativeSafeAreaProviderComponentView.h"
#import <React/RCTView.h>
#import "VxrnNative-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>

using namespace facebook::react;

@implementation OneNativeSafeAreaProviderComponentView {
  OneNativeSafeAreaProviderView *_providerView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeSafeAreaProviderComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeSafeAreaProviderProps>();
    _providerView = [OneNativeSafeAreaProviderView new];
    self.contentView = _providerView;
    __weak OneNativeSafeAreaProviderComponentView *weakSelf = self;
    _providerView.onInsets = ^BOOL(
        double top, double right, double bottom, double left, double x, double y, double width,
        double height) {
      OneNativeSafeAreaProviderComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return NO;
      auto emitter = std::static_pointer_cast<const OneNativeSafeAreaProviderEventEmitter>(
          strongSelf->_eventEmitter);
      emitter->onNativeInsetsChange(
          {.insetTop = top,
           .insetRight = right,
           .insetBottom = bottom,
           .insetLeft = left,
           .frameX = x,
           .frameY = y,
           .frameWidth = width,
           .frameHeight = height});
      return YES;
    };
  }
  return self;
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  [_providerView reset];
}

@end
