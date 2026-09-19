#import "OneNativeOverlayComponentView.h"
#import "OneNativeOverlayContentComponentView.h"
#import "OneNativeOverlayContentShadowNode.h"
#import <React/RCTView.h>
#import "VxrnNative-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeOverlayComponentView {
  OneNativeOverlayView *_overlayView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeOverlayComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeOverlayProps>();
    _overlayView = [OneNativeOverlayView new];
    self.container = _overlayView;
    self.contentView = _overlayView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeOverlayProps>(props);
  [_overlayView configureWithAlignment:RCTNSStringFromString(next.alignment)];
  [super updateProps:props oldProps:oldProps];
}

@end

@implementation OneNativeOverlayContentComponentView

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeOverlayContentComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeOverlayContentProps>();
    OneNativeOverlayContentView *contentView = [OneNativeOverlayContentView new];
    self.container = contentView;
    self.contentView = contentView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  [super updateProps:props oldProps:oldProps];
}

@end
