#import "OneNativeListComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <React/RCTConversions.h>
#import "OneNativeStyleDictionary.h"

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
    _listView.onSDKEvent = ^(NSString *name, NSString *value) {
      OneNativeListComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeListEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeSDKEvent({.name = std::string(name.UTF8String), .value = std::string(value.UTF8String)});
    };
    self.container = _listView;
    self.contentView = _listView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeListProps>(props);
  [_listView configureStyle:OneNativeStyleDictionary(next.swiftStyle)];
  [_listView configureWithListStyle:RCTNSStringFromString(next.listStyle)];
  [super updateProps:props oldProps:oldProps];
}

@end
