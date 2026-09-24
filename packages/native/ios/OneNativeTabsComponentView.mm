#include <cmath>
#import "OneNativeTabsComponentView.h"
#import <React/RCTView.h>
#import "VxrnNative-Swift.h"
#import "OneNativeTabShadowNode.h"
#import "OneNativeNavigationStackComponentView.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <React/RCTConversions.h>
#import "OneNativeStyleDictionary.h"

using namespace facebook::react;

@implementation OneNativeTabsComponentView {
  OneNativeTabsView *_tabsView;
  NSMutableArray<OneNativeTabComponentView *> *_pages;
  NSMutableArray<OneNativeToolbarView *> *_toolbars;
  BOOL _pagesDirty;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeTabsComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeTabsProps>();
    _pages = [NSMutableArray new];
    _toolbars = [NSMutableArray new];
    _tabsView = [OneNativeTabsView new];
    self.contentView = _tabsView;
    __weak OneNativeTabsComponentView *weakSelf = self;
    _tabsView.onSelection = ^(NSString *selection, NSInteger eventCount, NSInteger revision) {
      OneNativeTabsComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeTabsEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeTabsSelectionChange({.selection = std::string(selection.UTF8String), .eventCount = (int)eventCount, .revision = (int)revision});
    };
    _tabsView.onAction = ^(NSString *tabId) {
      OneNativeTabsComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeTabsEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeTabsAction({.tabId = std::string(tabId.UTF8String)});
    };
    _tabsView.onCustomization = ^(NSString *customization) {
      OneNativeTabsComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeTabsEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeTabsCustomizationChange({.customization = std::string(customization.UTF8String)});
    };
    _tabsView.onSDKEvent = ^(NSString *name, NSString *value) {
      OneNativeTabsComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeTabsEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeSDKEvent({.name = std::string(name.UTF8String), .value = std::string(value.UTF8String)});
    };
  }
  return self;
}

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  if ([child isKindOfClass:OneNativeToolbarComponentView.class]) {
    OneNativeToolbarView *toolbar = ((OneNativeToolbarComponentView *)child).toolbarView;
    [_toolbars addObject:toolbar];
    [_tabsView mountToolbar:toolbar];
    return;
  }
  NSAssert([child isKindOfClass:OneNativeTabComponentView.class], @"Swift.Tabs requires Swift.Tab or Swift.Toolbar children");
  OneNativeTabComponentView *page = (OneNativeTabComponentView *)child;
  page.tabs = self;
  [_pages insertObject:page atIndex:MIN(index, _pages.count)];
  [self invalidatePages];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  if ([child isKindOfClass:OneNativeToolbarComponentView.class]) {
    OneNativeToolbarView *toolbar = ((OneNativeToolbarComponentView *)child).toolbarView;
    [_toolbars removeObjectIdenticalTo:toolbar];
    [_tabsView unmountToolbar:toolbar];
    return;
  }
  OneNativeTabComponentView *page = (OneNativeTabComponentView *)child;
  page.tabs = nil;
  [_pages removeObjectIdenticalTo:page];
  [page removeFromSuperview];
  [self invalidatePages];
}

- (void)invalidatePages {
  _pagesDirty = YES;
  [self setNeedsLayout];
}

- (void)layoutSubviews {
  [super layoutSubviews];
  if (!_pagesDirty) return;
  _pagesDirty = NO;
  NSMutableArray *items = [NSMutableArray new];
  for (OneNativeTabComponentView *page in _pages) {
    __weak OneNativeTabComponentView *weakPage = page;
    OneNativeTabItem *item = [[OneNativeTabItem alloc]
      initWithId:page.tabId kind:page.kind title:page.title systemImage:page.systemImage badge:page.badge
      role:page.role slotHeight:page.slotHeight tabModifiers:page.tabModifiers view:page onLayout:^(CGRect frame) {
        OneNativeTabComponentView *strongPage = weakPage;
        if (strongPage.tabs) [strongPage updateNativeFrame:frame];
      }];
    [item configureStyle:page.swiftStyle];
    item.emit = ^(NSString *name, NSString *value) { [weakPage emitSDKEvent:name value:value]; };
    [items addObject:item];
  }
  [_tabsView setPages:items];
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeTabsProps>(props);
  [_tabsView configureStyle:OneNativeStyleDictionary(next.swiftStyle)];
  [_tabsView configureWithTabViewStyle:RCTNSStringFromString(next.tabViewStyle)
    tabBarVisibility:RCTNSStringFromString(next.tabBarVisibility)
    customization:RCTNSStringFromString(next.customization)
    customizable:next.customizable
    bottomAccessoryEnabled:next.bottomAccessoryEnabled];
  [_tabsView setSelection:RCTNSStringFromString(next.selection) acknowledgedEvent:next.acknowledgedEvent revision:next.revision];
  [super updateProps:props oldProps:oldProps];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  for (OneNativeTabComponentView *page in _pages) page.tabs = nil;
  [_pages removeAllObjects];
  [_toolbars removeAllObjects];
  [_tabsView reset];
  _pagesDirty = NO;
}

@end

@implementation OneNativeTabComponentView {
  OneNativeTabShadowNode::ConcreteState::Shared _tabState;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeTabComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeTabProps>();
    _tabId = @"";
    _kind = @"page";
    _title = @"";
    _systemImage = @"";
    _badge = @"";
    _role = @"";
    _slotHeight = 0;
    _tabModifiers = @"{}";
    _swiftStyle = @{};
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeTabProps>(props);
  NSString *tabId = RCTNSStringFromString(next.tabId);
  NSString *title = RCTNSStringFromString(next.title);
  NSString *systemImage = RCTNSStringFromString(next.systemImage);
  NSString *badge = RCTNSStringFromString(next.badge);
  NSString *role = RCTNSStringFromString(next.tabRole);
  NSString *kind = RCTNSStringFromString(next.kind);
  NSString *tabModifiers = RCTNSStringFromString(next.tabModifiers);
  NSDictionary *swiftStyle = OneNativeStyleDictionary(next.swiftStyle);
  BOOL changed = ![self.tabId isEqualToString:tabId] || ![self.kind isEqualToString:kind] ||
    ![self.title isEqualToString:title] || ![self.systemImage isEqualToString:systemImage] ||
    ![self.badge isEqualToString:badge] || ![self.role isEqualToString:role] ||
    self.slotHeight != next.slotHeight || ![self.tabModifiers isEqualToString:tabModifiers] ||
    ![self.swiftStyle isEqualToDictionary:swiftStyle];
  self.tabId = tabId;
  self.kind = kind;
  self.title = title;
  self.systemImage = systemImage;
  self.badge = badge;
  self.role = role;
  self.slotHeight = next.slotHeight;
  self.tabModifiers = tabModifiers;
  self.swiftStyle = swiftStyle;
  if (changed) [self.tabs invalidatePages];
  [super updateProps:props oldProps:oldProps];
}

- (void)emitSDKEvent:(NSString *)name value:(NSString *)value {
  if (!_eventEmitter) return;
  auto emitter = std::static_pointer_cast<const OneNativeTabEventEmitter>(_eventEmitter);
  emitter->onNativeSDKEvent({.name = std::string(name.UTF8String), .value = std::string(value.UTF8String)});
}

- (void)updateState:(State::Shared const &)state oldState:(State::Shared const &)oldState {
  _tabState = std::static_pointer_cast<const OneNativeTabShadowNode::ConcreteState>(state);
}

- (void)updateNativeFrame:(CGRect)frame {
  if (!_tabState || !std::isfinite(frame.size.width) || !std::isfinite(frame.size.height)) return;
  const auto &old = _tabState->getData();
  const facebook::react::Size size{(Float)frame.size.width, (Float)frame.size.height};
  const facebook::react::Point origin{(Float)frame.origin.x, (Float)frame.origin.y};
  if (old.measured && old.size == size && old.origin == origin) return;
  OneNativeTabState data;
  data.size = size;
  data.origin = origin;
  data.measured = true;
  _tabState->updateState(std::move(data));
}

- (void)updateLayoutMetrics:(LayoutMetrics const &)layoutMetrics oldLayoutMetrics:(LayoutMetrics const &)oldLayoutMetrics {
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  // SwiftUI owns placement. Fabric owns the page bounds and descendants' layout.
  self.frame = (CGRect){CGPointZero, self.bounds.size};
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  self.tabs = nil;
  _tabState.reset();
  _tabId = @""; _kind = @"page"; _title = @""; _systemImage = @""; _badge = @""; _role = @""; _tabModifiers = @"{}";
}

@end
