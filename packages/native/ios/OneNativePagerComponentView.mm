#import "OneNativePagerComponentView.h"
#import <React/RCTView.h>
#import "VxrnNative-Swift.h"
#import "OneNativeTabShadowNode.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativePagerComponentView {
  OneNativePagerView *_pagerView;
  NSMutableArray<OneNativeTabComponentView *> *_pages;
  BOOL _pagesDirty;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativePagerComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativePagerProps>();
    _pages = [NSMutableArray new];
    _pagerView = [OneNativePagerView new];
    self.contentView = _pagerView;
    __weak OneNativePagerComponentView *weakSelf = self;
    _pagerView.onSelection = ^(NSString *selection, NSInteger eventCount, NSInteger revision) {
      OneNativePagerComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativePagerEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativePagerSelectionChange({.selection = std::string(selection.UTF8String), .eventCount = (int)eventCount, .revision = (int)revision});
    };
  }
  return self;
}

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  NSAssert([child isKindOfClass:OneNativeTabComponentView.class], @"Swift.Pager requires Swift.Page children");
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
      initWithId:page.tabId title:@"" systemImage:@"" badge:@"" role:@""
      action:NO slotHeight:0 view:page onLayout:^(CGRect frame) {
        OneNativeTabComponentView *strongPage = weakPage;
        if (strongPage.tabs) [strongPage updateNativeFrame:frame];
      }];
    [items addObject:item];
  }
  [_pagerView setPages:items];
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativePagerProps>(props);
  [_pagerView setSelection:RCTNSStringFromString(next.selection) acknowledgedEvent:next.acknowledgedEvent revision:next.revision];
  [super updateProps:props oldProps:oldProps];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  for (OneNativeTabComponentView *page in _pages) page.tabs = nil;
  [_pages removeAllObjects];
  [_pagerView reset];
  _pagesDirty = NO;
}

@end
