#import "OneNativeMenuComponentView.h"
#import "OneNative-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <react/renderer/components/OneNativeSpec/Props.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeMenuComponentView {
  OneNativeMenuView *_menuView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<OneNativeMenuComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeMenuProps>();
    _menuView = [OneNativeMenuView new];
    self.contentView = _menuView;
    __weak OneNativeMenuComponentView *weakSelf = self;
    _menuView.onAction = ^(NSString *identifier) {
      OneNativeMenuComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeMenuEventEmitter>(strongSelf->_eventEmitter);
      emitter->onAction({.id = std::string(identifier.UTF8String)});
    };
  }
  return self;
}

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index
{
  [_menuView mountTrigger:child];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index
{
  [_menuView unmountTrigger:child];
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &next = *std::static_pointer_cast<const OneNativeMenuProps>(props);
  NSMutableArray *items = [NSMutableArray new];
  for (const auto &item : next.items) {
    [items addObject:@{
      @"id": RCTNSStringFromString(item.id),
      @"parentId": RCTNSStringFromString(item.parentId),
      @"type": RCTNSStringFromString(item.type),
      @"title": RCTNSStringFromString(item.title),
      @"subtitle": RCTNSStringFromString(item.subtitle),
      @"systemImage": RCTNSStringFromString(item.systemImage),
      @"state": RCTNSStringFromString(item.state),
      @"disabled": @(item.disabled),
      @"destructive": @(item.destructive),
      @"hidden": @(item.hidden),
      @"keepsMenuPresented": @(item.keepsMenuPresented),
      @"displayInline": @(item.displayInline),
      @"singleSelection": @(item.singleSelection),
      @"displayAsPalette": @(item.displayAsPalette),
      @"preferredElementSize": RCTNSStringFromString(item.preferredElementSize),
      @"discoverabilityTitle": RCTNSStringFromString(item.discoverabilityTitle)
    }];
  }
  [_menuView configureItems:items title:RCTNSStringFromString(next.menuTitle)
              triggerLabel:RCTNSStringFromString(next.triggerLabel) disabled:next.disabled];
  [super updateProps:props oldProps:oldProps];
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  [_menuView reset];
}

@end
