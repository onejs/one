#import "OneNativeGeometryReaderComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
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
    _geometryReader.onGeometry = ^(CGFloat x, CGFloat y, CGFloat width, CGFloat height, CGFloat safeAreaTop, CGFloat safeAreaLeading, CGFloat safeAreaBottom, CGFloat safeAreaTrailing) {
      OneNativeGeometryReaderComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeGeometryReaderEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeGeometryReaderChange({.x = (double)x, .y = (double)y, .width = (double)width, .height = (double)height, .safeAreaTop = (double)safeAreaTop, .safeAreaLeading = (double)safeAreaLeading, .safeAreaBottom = (double)safeAreaBottom, .safeAreaTrailing = (double)safeAreaTrailing});
    };
    self.container = _geometryReader;
    self.contentView = _geometryReader;
  }
  return self;
}

@end
