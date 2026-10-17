#import "OneNativeOutlineRowComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeOutlineRowComponentView {
  OneNativeOutlineRowView *_row;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeOutlineRowComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeOutlineRowProps>();
    _row = [OneNativeOutlineRowView new];
    self.container = _row;
    self.contentView = _row;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeOutlineRowProps>(props);
  [_row configureWithRowId:RCTNSStringFromString(next.rowId)];
  [super updateProps:props oldProps:oldProps];
}

@end
