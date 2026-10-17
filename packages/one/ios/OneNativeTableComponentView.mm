#import "OneNativeTableComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import "OneNativeContainerStyle.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeTableComponentView {
  OneNativeTableView *_table;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeTableComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeTableProps>();
    _table = [OneNativeTableView new];
    self.container = _table;
    OneNativeForwardSwiftStyleEvents<OneNativeTableEventEmitter>(self);
    self.contentView = _table;
    __weak OneNativeTableComponentView *weakSelf = self;
    _table.onSortChange = ^(NSString *sort, NSInteger eventCount, NSInteger revision) {
      OneNativeTableComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeTableEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeTableSortChange({.sort = std::string(sort.UTF8String), .eventCount = (int)eventCount, .revision = (int)revision});
    };
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeTableProps>(props);
  [_table configureSwiftStyle:OneNativeStyleDictionary(next.swiftStyle)];
  [_table configureWithRows:RCTNSStringFromString(next.rows)
                    columns:RCTNSStringFromString(next.columns)
                   sortable:next.sortable
                       sort:RCTNSStringFromString(next.sort)
          acknowledgedEvent:next.acknowledgedEvent
                   revision:next.revision];
  [super updateProps:props oldProps:oldProps];
}

@end
