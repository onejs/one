#import "OneNativeListComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import "OneNativeContainerStyle.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeListComponentView {
  OneNativeListView *_listView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeListComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeListProps>();
    _listView = [OneNativeListView new];
    __weak OneNativeListComponentView *weakSelf = self;
    _listView.onSelectionChange = ^(NSString *selection) {
      OneNativeListComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeListEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeListSelectionChange({.selection = std::string(selection.UTF8String)});
    };
    self.container = _listView;
    OneNativeForwardSwiftStyleEvents<OneNativeListEventEmitter>(self);
    self.contentView = _listView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeListProps>(props);
  [_listView configureSwiftStyle:OneNativeStyleDictionary(next.swiftStyle)];
  [_listView configureWithListStyle:RCTNSStringFromString(next.listStyle)
    selection:RCTNSStringFromString(next.selection)
    selectionIsControlled:next.selectionIsControlled];
  [super updateProps:props oldProps:oldProps];
}

@end
