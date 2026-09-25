#include <cmath>
#import "OneNativeNavigationStackComponentView.h"
#import "OneNativeContainerComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import "OneNativeNavigationStackContentShadowNode.h"
#import "OneNativeStyleDictionary.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/Props.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeNavigationStackComponentView {
  OneNativeNavigationStackView *_stackView;
  NSMutableArray<OneNativeToolbarView *> *_toolbars;
  __weak OneNativeNavigationStackContentComponentView *_content;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeNavigationStackComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeNavigationStackProps>();
    _toolbars = [NSMutableArray new];
    _stackView = [OneNativeNavigationStackView new];
    self.contentView = _stackView;
    __weak OneNativeNavigationStackComponentView *weakSelf = self;
    _stackView.onSDKEvent = ^(NSString *name, NSString *value) {
      OneNativeNavigationStackComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeNavigationStackEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeSDKEvent({.name = std::string(name.UTF8String), .value = std::string(value.UTF8String)});
    };
  }
  return self;
}

// the stack takes one content child and any number of Toolbar markers. anything else can
// never render here, and publication would drop it without saying so.
- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  if ([child isKindOfClass:OneNativeNavigationStackContentComponentView.class]) {
    OneNativeNavigationStackContentComponentView *content = (OneNativeNavigationStackContentComponentView *)child;
    __weak OneNativeNavigationStackContentComponentView *weakContent = content;
    _content = content;
    [_stackView mountContent:child onLayout:^(CGRect frame) { [weakContent updateNativeFrame:frame]; }];
    return;
  }
  if ([child isKindOfClass:OneNativeToolbarComponentView.class]) {
    OneNativeToolbarView *toolbar = ((OneNativeToolbarComponentView *)child).toolbarView;
    [_toolbars addObject:toolbar];
    [_stackView mountToolbar:toolbar];
    return;
  }
  [NSException raise:@"OneNativeInvalidChild"
              format:@"Swift.NavigationStack takes Swift.Toolbar markers and the React Native "
                     @"content it renders. A second content child cannot render."];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  if ([child isKindOfClass:OneNativeNavigationStackContentComponentView.class]) {
    if (_content == child) _content = nil;
    [_stackView unmountContent:child];
    return;
  }
  if ([child isKindOfClass:OneNativeToolbarComponentView.class]) {
    OneNativeToolbarView *toolbar = ((OneNativeToolbarComponentView *)child).toolbarView;
    [_toolbars removeObjectIdenticalTo:toolbar];
    [_stackView unmountToolbar:toolbar];
  }
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeNavigationStackProps>(props);
  [_stackView configureStyle:OneNativeStyleDictionary(next.swiftStyle)];
  [super updateProps:props oldProps:oldProps];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  _content = nil;
  [_toolbars removeAllObjects];
  [_stackView reset];
}

@end

@implementation OneNativeNavigationStackContentComponentView {
  OneNativeNavigationStackContentShadowNode::ConcreteState::Shared _slotState;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeNavigationStackContentComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeNavigationStackContentProps>();
  }
  return self;
}

- (void)updateState:(State::Shared const &)state oldState:(State::Shared const &)oldState {
  _slotState = std::static_pointer_cast<const OneNativeNavigationStackContentShadowNode::ConcreteState>(state);
}

- (void)updateNativeFrame:(CGRect)frame {
  if (!_slotState || !std::isfinite(frame.size.width) || !std::isfinite(frame.size.height)) return;
  const auto &old = _slotState->getData();
  const facebook::react::Size size{(Float)frame.size.width, (Float)frame.size.height};
  if (old.measured && old.size == size) return;
  OneNativeSlotState data;
  data.size = size;
  data.measured = true;
  _slotState->updateState(std::move(data));
}

- (void)updateLayoutMetrics:(LayoutMetrics const &)layoutMetrics oldLayoutMetrics:(LayoutMetrics const &)oldLayoutMetrics {
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  // SwiftUI owns placement. Fabric owns the content bounds and the descendants' layout.
  self.frame = (CGRect){CGPointZero, self.bounds.size};
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  _slotState.reset();
}

@end

@implementation OneNativeToolbarComponentView {
  OneNativeToolbarView *_toolbarView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeToolbarComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeToolbarProps>();
    _toolbarView = [OneNativeToolbarView new];
    self.container = _toolbarView;
    self.contentView = _toolbarView;
  }
  return self;
}

- (OneNativeToolbarView *)toolbarView { return _toolbarView; }

@end

// the three markers are one Swift view configured by kind, so each component view only
// reads its own props into that shared shape.
@implementation OneNativeToolbarItemComponentView {
  OneNativeToolbarMarkerView *_markerView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeToolbarItemComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeToolbarItemProps>();
    _markerView = [OneNativeToolbarMarkerView new];
    self.container = _markerView;
    self.contentView = _markerView;
    __weak OneNativeToolbarItemComponentView *weakSelf = self;
    [_markerView setOnSDKEvent:^(NSString *name, NSString *value) {
      OneNativeToolbarItemComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeToolbarItemEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeSDKEvent({.name = std::string(name.UTF8String), .value = std::string(value.UTF8String)});
    }];
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeToolbarItemProps>(props);
  [_markerView configureWithKind:@"item"
    placement:RCTNSStringFromString(next.placement)
    sizing:@"flexible"
    label:@""
    systemImage:@""];
  [_markerView configureStyle:OneNativeStyleDictionary(next.swiftStyle)];
  [super updateProps:props oldProps:oldProps];
}

@end

@implementation OneNativeToolbarItemGroupComponentView {
  OneNativeToolbarMarkerView *_markerView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeToolbarItemGroupComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeToolbarItemGroupProps>();
    _markerView = [OneNativeToolbarMarkerView new];
    self.container = _markerView;
    self.contentView = _markerView;
    __weak OneNativeToolbarItemGroupComponentView *weakSelf = self;
    [_markerView setOnSDKEvent:^(NSString *name, NSString *value) {
      OneNativeToolbarItemGroupComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeToolbarItemGroupEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeSDKEvent({.name = std::string(name.UTF8String), .value = std::string(value.UTF8String)});
    }];
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeToolbarItemGroupProps>(props);
  [_markerView configureWithKind:@"group"
    placement:RCTNSStringFromString(next.placement)
    sizing:@"flexible"
    label:RCTNSStringFromString(next.label)
    systemImage:RCTNSStringFromString(next.systemImage)];
  [_markerView configureStyle:OneNativeStyleDictionary(next.swiftStyle)];
  [super updateProps:props oldProps:oldProps];
}

@end

@implementation OneNativeToolbarSpacerComponentView {
  OneNativeToolbarMarkerView *_markerView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeToolbarSpacerComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeToolbarSpacerProps>();
    _markerView = [OneNativeToolbarMarkerView new];
    self.container = _markerView;
    self.contentView = _markerView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeToolbarSpacerProps>(props);
  [_markerView configureWithKind:@"spacer"
    placement:RCTNSStringFromString(next.placement)
    sizing:RCTNSStringFromString(next.sizing)
    label:@""
    systemImage:@""];
  [super updateProps:props oldProps:oldProps];
}

@end
