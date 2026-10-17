#import "OneNativeGridRowComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import "OneNativeContainerStyle.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeGridRowComponentView {
  OneNativeGridRowView *_rowView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeGridRowComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeGridRowProps>();
    _rowView = [OneNativeGridRowView new];
    self.container = _rowView;
    OneNativeForwardSwiftStyleEvents<OneNativeGridRowEventEmitter>(self);
    self.contentView = _rowView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeGridRowProps>(props);
  [_rowView configureSwiftStyle:OneNativeStyleDictionary(next.swiftStyle)];
  [_rowView configureWithAlignment:RCTNSStringFromString(next.alignment)];
  [super updateProps:props oldProps:oldProps];
}

@end
