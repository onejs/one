#include <cmath>
#import "OneNativeTabsComponentView.h"
#import "OneNative-Swift.h"
#import "OneNativeTabShadowNode.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeTabsComponentView {
  OneNativeTabsView *_tabsView;
  NSMutableArray<OneNativeTabComponentView *> *_pages;
  BOOL _pagesDirty;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeTabsComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeTabsProps>();
    _pages = [NSMutableArray new];
    _tabsView = [OneNativeTabsView new];
    self.contentView = _tabsView;
    __weak OneNativeTabsComponentView *weakSelf = self;
    _tabsView.onSelection = ^(NSString *selection, NSInteger eventCount, NSInteger revision) {
      OneNativeTabsComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeTabsEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeTabsSelectionChange({.selection = std::string(selection.UTF8String), .eventCount = (int)eventCount, .revision = (int)revision});
    };
  }
  return self;
}

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  NSAssert([child isKindOfClass:OneNativeTabComponentView.class], @"Swift.Tabs requires Swift.Tab children");
  OneNativeTabComponentView *page = (OneNativeTabComponentView *)child;
  page.tabs = self;
  [_pages insertObject:page atIndex:index];
  [self invalidatePages];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
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
      initWithId:page.tabId title:page.title systemImage:page.systemImage badge:page.badge role:page.role
      view:page onLayout:^(CGRect frame) {
        OneNativeTabComponentView *strongPage = weakPage;
        if (strongPage.tabs) [strongPage updateNativeFrame:frame];
      }];
    [items addObject:item];
  }
  [_tabsView setPages:items];
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeTabsProps>(props);
  [_tabsView setSelection:RCTNSStringFromString(next.selection) acknowledgedEvent:next.acknowledgedEvent revision:next.revision
         sidebarAdaptable:next.sidebarAdaptable tabBarMinimizeBehavior:RCTNSStringFromString(next.tabBarMinimizeBehavior)];
  [super updateProps:props oldProps:oldProps];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  for (OneNativeTabComponentView *page in _pages) page.tabs = nil;
  [_pages removeAllObjects];
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
    _title = @"";
    _systemImage = @"";
    _badge = @"";
    _role = @"";
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
  BOOL changed = ![self.tabId isEqualToString:tabId] || ![self.title isEqualToString:title] ||
    ![self.systemImage isEqualToString:systemImage] || ![self.badge isEqualToString:badge] || ![self.role isEqualToString:role];
  self.tabId = tabId;
  self.title = title;
  self.systemImage = systemImage;
  self.badge = badge;
  self.role = role;
  if (changed) [self.tabs invalidatePages];
  [super updateProps:props oldProps:oldProps];
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
  _tabId = @""; _title = @""; _systemImage = @""; _badge = @""; _role = @"";
}

@end
