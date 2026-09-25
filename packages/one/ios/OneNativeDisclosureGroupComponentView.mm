#import "OneNativeDisclosureGroupComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeDisclosureGroupComponentView {
  OneNativeDisclosureGroupView *_groupView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeDisclosureGroupComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeDisclosureGroupProps>();
    _groupView = [OneNativeDisclosureGroupView new];
    self.container = _groupView;
    self.contentView = _groupView;
    __weak OneNativeDisclosureGroupComponentView *weakSelf = self;
    _groupView.onChange = ^(BOOL value, NSInteger eventCount, NSInteger revision) {
      OneNativeDisclosureGroupComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeDisclosureGroupEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeDisclosureGroupIsExpandedChange({.value = (bool)value, .eventCount = (int)eventCount, .revision = (int)revision});
    };
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeDisclosureGroupProps>(props);
  [_groupView configureWithLabel:RCTNSStringFromString(next.label)
                      isExpanded:next.isExpanded
               acknowledgedEvent:next.acknowledgedEvent
                        revision:next.revision];
  [super updateProps:props oldProps:oldProps];
}

@end
