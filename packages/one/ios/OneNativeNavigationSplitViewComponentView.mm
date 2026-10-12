#import "OneNativeNavigationSplitViewComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import "OneNativeStyleDictionary.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeNavigationSplitViewComponentView {
  OneNativeNavigationSplitViewView *_splitView;
  NSMutableArray<OneNativeNavigationSplitViewColumnComponentView *> *_columns;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeNavigationSplitViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeNavigationSplitViewProps>();
    _columns = [NSMutableArray new];
    _splitView = [OneNativeNavigationSplitViewView new];
    self.contentView = _splitView;
    __weak OneNativeNavigationSplitViewComponentView *weakSelf = self;
    _splitView.onColumnVisibilityChange = ^(NSString *visibility) {
      OneNativeNavigationSplitViewComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeNavigationSplitViewEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeNavigationSplitViewColumnVisibilityChange({.visibility = std::string(visibility.UTF8String)});
    };
    _splitView.onPreferredCompactColumnChange = ^(NSString *column) {
      OneNativeNavigationSplitViewComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeNavigationSplitViewEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeNavigationSplitViewPreferredCompactColumnChange({.column = std::string(column.UTF8String)});
    };
    _splitView.onSDKEvent = ^(NSString *name, NSString *value) {
      OneNativeNavigationSplitViewComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeNavigationSplitViewEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeSDKEvent({.name = std::string(name.UTF8String), .value = std::string(value.UTF8String)});
    };
  }
  return self;
}

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  if (![child isKindOfClass:OneNativeNavigationSplitViewColumnComponentView.class]) {
    [NSException raise:@"OneNativeInvalidChild"
                format:@"Swift.NavigationSplitView takes Sidebar, Content, and Detail column markers."];
  }
  OneNativeNavigationSplitViewColumnComponentView *column =
    (OneNativeNavigationSplitViewColumnComponentView *)child;
  NSString *name = column.columnView.columnName;
  if (![@[@"sidebar", @"content", @"detail"] containsObject:name]) {
    [NSException raise:@"OneNativeInvalidSlot"
                format:@"Swift.NavigationSplitView has an invalid column: %@", name];
  }
  for (OneNativeNavigationSplitViewColumnComponentView *mounted in _columns) {
    if ([mounted.columnView.columnName isEqualToString:name]) {
      [NSException raise:@"OneNativeInvalidSlot"
                  format:@"Swift.NavigationSplitView accepts one %@ column.", name];
    }
  }
  [_columns insertObject:column atIndex:MIN(index, _columns.count)];
  [_splitView mountColumn:column.columnView];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  if (![child isKindOfClass:OneNativeNavigationSplitViewColumnComponentView.class]) return;
  OneNativeNavigationSplitViewColumnComponentView *column =
    (OneNativeNavigationSplitViewColumnComponentView *)child;
  [_columns removeObjectIdenticalTo:column];
  [_splitView unmountColumn:column.columnView];
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeNavigationSplitViewProps>(props);
  [_splitView configureWithColumnVisibility:RCTNSStringFromString(next.columnVisibility)
    columnVisibilityIsControlled:next.columnVisibilityIsControlled
    preferredCompactColumn:RCTNSStringFromString(next.preferredCompactColumn)
    preferredCompactColumnIsControlled:next.preferredCompactColumnIsControlled];
  [_splitView configureStyle:OneNativeStyleDictionary(next.swiftStyle)];
  [super updateProps:props oldProps:oldProps];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  for (OneNativeNavigationSplitViewColumnComponentView *column in _columns) {
    [_splitView unmountColumn:column.columnView];
  }
  [_columns removeAllObjects];
  [_splitView reset];
}

@end

@implementation OneNativeNavigationSplitViewColumnComponentView {
  OneNativeNavigationSplitViewColumnView *_columnView;
  __weak OneNativeNavigationStackContentComponentView *_content;
  NSMutableArray<OneNativeToolbarView *> *_toolbars;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeNavigationSplitViewColumnComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeNavigationSplitViewColumnProps>();
    _toolbars = [NSMutableArray new];
    _columnView = [OneNativeNavigationSplitViewColumnView new];
    self.contentView = _columnView;
    __weak OneNativeNavigationSplitViewColumnComponentView *weakSelf = self;
    _columnView.onSDKEvent = ^(NSString *name, NSString *value) {
      OneNativeNavigationSplitViewColumnComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeNavigationSplitViewColumnEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeSDKEvent({.name = std::string(name.UTF8String), .value = std::string(value.UTF8String)});
    };
  }
  return self;
}

- (OneNativeNavigationSplitViewColumnView *)columnView { return _columnView; }

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  if ([child isKindOfClass:OneNativeNavigationStackContentComponentView.class]) {
    if (_content) {
      [NSException raise:@"OneNativeInvalidSlot"
                  format:@"Swift.NavigationSplitView column takes one React Native content slot."];
    }
    OneNativeNavigationStackContentComponentView *content =
      (OneNativeNavigationStackContentComponentView *)child;
    __weak OneNativeNavigationStackContentComponentView *weakContent = content;
    _content = content;
    [_columnView mountContent:child onLayout:^(CGRect frame) {
      [weakContent updateNativeFrame:frame];
    }];
    return;
  }
  if ([child isKindOfClass:OneNativeToolbarComponentView.class]) {
    if (_toolbars.count > 0) {
      [NSException raise:@"OneNativeInvalidSlot"
                  format:@"Swift.NavigationSplitView column takes one Swift.Toolbar."];
    }
    OneNativeToolbarView *toolbar = ((OneNativeToolbarComponentView *)child).toolbarView;
    [_toolbars addObject:toolbar];
    [_columnView mountToolbar:toolbar];
    return;
  }
  [NSException raise:@"OneNativeInvalidChild"
              format:@"Swift.NavigationSplitView column takes Swift.Toolbar and its React Native content."];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  if ([child isKindOfClass:OneNativeNavigationStackContentComponentView.class]) {
    if (_content == child) _content = nil;
    [_columnView unmountContent:child];
    return;
  }
  if ([child isKindOfClass:OneNativeToolbarComponentView.class]) {
    OneNativeToolbarView *toolbar = ((OneNativeToolbarComponentView *)child).toolbarView;
    [_toolbars removeObjectIdenticalTo:toolbar];
    [_columnView unmountToolbar:toolbar];
  }
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeNavigationSplitViewColumnProps>(props);
  [_columnView configureWithColumn:RCTNSStringFromString(next.column)
    style:OneNativeStyleDictionary(next.swiftStyle)];
  [super updateProps:props oldProps:oldProps];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  _content = nil;
  [_toolbars removeAllObjects];
  [_columnView reset];
}

@end
