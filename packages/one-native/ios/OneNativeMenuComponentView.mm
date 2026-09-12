#import "OneNativeMenuComponentView.h"
#import "OneNative-Swift.h"
#import "Generated/OneNativeMenuPayload.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <react/renderer/components/OneNativeSpec/Props.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeMenuComponentView {
  OneNativeMenuView *_menuView;
  BOOL _itemsDirty;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<OneNativeMenuComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeMenuProps>();
    _itemsDirty = YES;
    _menuView = [OneNativeMenuView new];
    self.contentView = _menuView;
    __weak OneNativeMenuComponentView *weakSelf = self;
    _menuView.onAction = ^(NSString *identifier) {
      OneNativeMenuComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeMenuEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeMenuAction({.id = std::string(identifier.UTF8String)});
    };
    _menuView.onValueChange = ^(NSString *identifier, BOOL value, NSInteger sourceIndex, NSInteger eventCount, NSInteger revision) {
      OneNativeMenuComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeMenuEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeMenuValueChange({.id = std::string(identifier.UTF8String), .value = (bool)value, .sourceIndex = (int)sourceIndex, .eventCount = (int)eventCount, .revision = (int)revision});
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
  const auto &previous = *std::static_pointer_cast<const OneNativeMenuProps>(_props);
  if (_itemsDirty || !OneNativeMenuItemsEqual(previous.items, next.items)) {
    [_menuView configureItems:OneNativeMenuPayload(next.items)];
    _itemsDirty = NO;
  }
  [_menuView configure:RCTNSStringFromString(next.triggerLabel) disabled:next.disabled
              menuOrder:RCTNSStringFromString(next.menuOrder)
              menuActionDismissBehavior:RCTNSStringFromString(next.menuActionDismissBehavior)
              presentation:RCTNSStringFromString(next.presentation)
              acknowledgedEvent:next.acknowledgedEvent revision:next.revision];
  [super updateProps:props oldProps:oldProps];
}

- (void)updateLayoutMetrics:(const LayoutMetrics &)layoutMetrics oldLayoutMetrics:(const LayoutMetrics &)oldLayoutMetrics
{
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  // the representable shares the fabric parent's coordinates; yoga owns the trigger frame.
  _menuView.frame = self.bounds;
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  [_menuView reset];
  _itemsDirty = YES;
}

@end
