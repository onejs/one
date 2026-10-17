#import "OneNativeGeometryReaderComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import "OneNativeContainerStyle.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeGeometryReaderComponentView {
  OneNativeGeometryReaderView *_geometryReader;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeGeometryReaderComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeGeometryReaderProps>();
    _geometryReader = [OneNativeGeometryReaderView new];
    __weak OneNativeGeometryReaderComponentView *weakSelf = self;
    _geometryReader.onGeometry = ^(CGFloat x, CGFloat y, CGFloat width, CGFloat height, CGFloat localX, CGFloat localY, CGFloat localWidth, CGFloat localHeight, CGFloat sizeWidth, CGFloat sizeHeight, CGFloat safeAreaTop, CGFloat safeAreaLeading, CGFloat safeAreaBottom, CGFloat safeAreaTrailing) {
      OneNativeGeometryReaderComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeGeometryReaderEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeGeometryReaderChange({.x = (double)x, .y = (double)y, .width = (double)width, .height = (double)height, .localX = (double)localX, .localY = (double)localY, .localWidth = (double)localWidth, .localHeight = (double)localHeight, .sizeWidth = (double)sizeWidth, .sizeHeight = (double)sizeHeight, .safeAreaTop = (double)safeAreaTop, .safeAreaLeading = (double)safeAreaLeading, .safeAreaBottom = (double)safeAreaBottom, .safeAreaTrailing = (double)safeAreaTrailing});
    };
    self.container = _geometryReader;
    OneNativeForwardSwiftStyleEvents<OneNativeGeometryReaderEventEmitter>(self);
    self.contentView = _geometryReader;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeGeometryReaderProps>(props);
  [_geometryReader configureSwiftStyle:OneNativeStyleDictionary(next.swiftStyle)];
  [super updateProps:props oldProps:oldProps];
}

@end
