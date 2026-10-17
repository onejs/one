#import "OneNativeTableCellComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeTableCellComponentView {
  OneNativeTableCellView *_cell;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeTableCellComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeTableCellProps>();
    _cell = [OneNativeTableCellView new];
    self.container = _cell;
    self.contentView = _cell;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeTableCellProps>(props);
  [_cell configureWithRowId:RCTNSStringFromString(next.rowId) columnId:RCTNSStringFromString(next.columnId)];
  [super updateProps:props oldProps:oldProps];
}

@end
