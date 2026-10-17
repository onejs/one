#import "OneNativeScrollViewReaderComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import "OneNativeContainerStyle.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

@interface OneNativeScrollViewReaderComponentView () <RCTOneNativeScrollViewReaderViewProtocol>
@end

@implementation OneNativeScrollViewReaderComponentView {
  OneNativeScrollViewReaderView *_reader;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeScrollViewReaderComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeScrollViewReaderProps>();
    _reader = [OneNativeScrollViewReaderView new];
    self.container = _reader;
    OneNativeForwardSwiftStyleEvents<OneNativeScrollViewReaderEventEmitter>(self);
    self.contentView = _reader;
  }
  return self;
}

- (void)scrollTo:(NSString *)scrollID hasAnchor:(BOOL)hasAnchor anchorX:(double)anchorX anchorY:(double)anchorY {
  [_reader scrollTo:scrollID hasAnchor:hasAnchor anchorX:anchorX anchorY:anchorY];
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeScrollViewReaderProps>(props);
  [_reader configureSwiftStyle:OneNativeStyleDictionary(next.swiftStyle)];
  [super updateProps:props oldProps:oldProps];
}

- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args {
  RCTOneNativeScrollViewReaderHandleCommand(self, commandName, args);
}

@end
