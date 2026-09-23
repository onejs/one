#include <cmath>
#import "OneNativeArrangementViewComponentView.h"
#import <React/RCTView.h>
#import "VxrnNative-Swift.h"
#import "OneNativeArrangementSlotShadowNode.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <React/RCTConversions.h>
#import "OneNativeStyleDictionary.h"

using namespace facebook::react;

@implementation OneNativeArrangementViewComponentView {
  OneNativeArrangementView *_arrangementView;
  NSMutableArray<OneNativeArrangementSlotComponentView *> *_panes;
  BOOL _panesDirty;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeArrangementViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeArrangementViewProps>();
    _panes = [NSMutableArray new];
    _arrangementView = [OneNativeArrangementView new];
    self.contentView = _arrangementView;
    __weak OneNativeArrangementViewComponentView *weakSelf = self;
    _arrangementView.onSDKEvent = ^(NSString *name, NSString *value) {
      OneNativeArrangementViewComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeArrangementViewEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeSDKEvent({.name = std::string(name.UTF8String), .value = std::string(value.UTF8String)});
    };
  }
  return self;
}

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  NSAssert([child isKindOfClass:OneNativeArrangementSlotComponentView.class], @"Swift.ArrangementView requires slot children");
  OneNativeArrangementSlotComponentView *pane = (OneNativeArrangementSlotComponentView *)child;
  pane.arrangementHost = self;
  [_panes insertObject:pane atIndex:index];
  [self invalidatePanes];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  OneNativeArrangementSlotComponentView *pane = (OneNativeArrangementSlotComponentView *)child;
  pane.arrangementHost = nil;
  [_panes removeObjectIdenticalTo:pane];
  [pane removeFromSuperview];
  [self invalidatePanes];
}

- (void)invalidatePanes {
  _panesDirty = YES;
  [self setNeedsLayout];
}

- (void)layoutSubviews {
  [super layoutSubviews];
  if (!_panesDirty) return;
  _panesDirty = NO;

  OneNativeArrangementItem *primaryItem = nil;
  OneNativeArrangementItem *secondaryItem = nil;

  for (OneNativeArrangementSlotComponentView *pane in _panes) {
    __weak OneNativeArrangementSlotComponentView *weakPane = pane;
    OneNativeArrangementModifiers *mods = [[OneNativeArrangementModifiers alloc]
      initWithSplitRatio:pane.splitRatio >= 0 ? @(pane.splitRatio) : nil
      splitMinHorizontal:pane.splitMinHorizontal >= 0 ? @(pane.splitMinHorizontal) : nil
      splitIdealHorizontal:pane.splitIdealHorizontal >= 0 ? @(pane.splitIdealHorizontal) : nil
      splitMaxHorizontal:pane.splitMaxHorizontal >= 0 ? @(pane.splitMaxHorizontal) : nil
      splitMinVertical:pane.splitMinVertical >= 0 ? @(pane.splitMinVertical) : nil
      splitIdealVertical:pane.splitIdealVertical >= 0 ? @(pane.splitIdealVertical) : nil
      splitMaxVertical:pane.splitMaxVertical >= 0 ? @(pane.splitMaxVertical) : nil
      splitMinWidth:pane.splitMinWidth >= 0 ? @(pane.splitMinWidth) : nil
      splitIdealWidth:pane.splitIdealWidth >= 0 ? @(pane.splitIdealWidth) : nil
      splitMaxWidth:pane.splitMaxWidth >= 0 ? @(pane.splitMaxWidth) : nil
      splitMinHeight:pane.splitMinHeight >= 0 ? @(pane.splitMinHeight) : nil
      splitIdealHeight:pane.splitIdealHeight >= 0 ? @(pane.splitIdealHeight) : nil
      splitMaxHeight:pane.splitMaxHeight >= 0 ? @(pane.splitMaxHeight) : nil
      splitFixedHorizontal:pane.splitFixedHorizontal ? @(YES) : nil
      splitFixedVertical:pane.splitFixedVertical ? @(YES) : nil
      overlayEdge:pane.overlayEdge.length ? pane.overlayEdge : nil
    ];

    OneNativeArrangementItem *item = [[OneNativeArrangementItem alloc]
      initWithPlacement:pane.placement
      view:pane
      onLayout:^(CGRect frame) {
        OneNativeArrangementSlotComponentView *strongPane = weakPane;
        if (strongPane.arrangementHost) [strongPane updateNativeFrame:frame];
      }
      modifiers:mods
    ];

    if ([pane.placement isEqualToString:@"primary"] || [pane.placement isEqualToString:@"leading"]) {
      primaryItem = item;
    } else if ([pane.placement isEqualToString:@"secondary"] || [pane.placement isEqualToString:@"detail"]) {
      secondaryItem = item;
    }
  }

  // fallback to order if placement not specified
  if (!primaryItem && _panes.count > 0) {
    __weak OneNativeArrangementSlotComponentView *weakPane = _panes[0];
    OneNativeArrangementModifiers *mods = [[OneNativeArrangementModifiers alloc] init];
    primaryItem = [[OneNativeArrangementItem alloc]
      initWithPlacement:@"primary"
      view:_panes[0]
      onLayout:^(CGRect frame) {
        OneNativeArrangementSlotComponentView *strongPane = weakPane;
        if (strongPane.arrangementHost) [strongPane updateNativeFrame:frame];
      }
      modifiers:mods
    ];
  }
  if (!secondaryItem && _panes.count > 1) {
    __weak OneNativeArrangementSlotComponentView *weakPane = _panes[1];
    OneNativeArrangementModifiers *mods = [[OneNativeArrangementModifiers alloc] init];
    secondaryItem = [[OneNativeArrangementItem alloc]
      initWithPlacement:@"secondary"
      view:_panes[1]
      onLayout:^(CGRect frame) {
        OneNativeArrangementSlotComponentView *strongPane = weakPane;
        if (strongPane.arrangementHost) [strongPane updateNativeFrame:frame];
      }
      modifiers:mods
    ];
  }

  [_arrangementView setPanesWithPrimary:primaryItem secondary:secondaryItem];
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeArrangementViewProps>(props);
  [_arrangementView configureStyle:OneNativeStyleDictionary(next.swiftStyle)];
  [_arrangementView configureWithStyle:RCTNSStringFromString(next.arrangementViewStyle)
                             splitAxes:RCTNSStringFromString(next.splitAxes)
                           overlayAxes:RCTNSStringFromString(next.overlayAxes)
                            splitRatio:next.splitRatio
                    splitMinHorizontal:next.splitMinHorizontal
                  splitIdealHorizontal:next.splitIdealHorizontal
                    splitMaxHorizontal:next.splitMaxHorizontal
                      splitMinVertical:next.splitMinVertical
                    splitIdealVertical:next.splitIdealVertical
                      splitMaxVertical:next.splitMaxVertical
                        splitMinWidth:next.splitMinWidth
                       splitIdealWidth:next.splitIdealWidth
                        splitMaxWidth:next.splitMaxWidth
                       splitMinHeight:next.splitMinHeight
                      splitIdealHeight:next.splitIdealHeight
                       splitMaxHeight:next.splitMaxHeight
                 splitFixedHorizontal:next.splitFixedHorizontal
                   splitFixedVertical:next.splitFixedVertical
                          overlayEdge:RCTNSStringFromString(next.overlayEdge)];
  [super updateProps:props oldProps:oldProps];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  for (OneNativeArrangementSlotComponentView *pane in _panes) pane.arrangementHost = nil;
  [_panes removeAllObjects];
  [_arrangementView reset];
  _panesDirty = NO;
}

@end

@implementation OneNativeArrangementSlotComponentView {
  OneNativeArrangementSlotShadowNode::ConcreteState::Shared _slotState;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeArrangementSlotComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeArrangementSlotProps>();
    _placement = @"primary";
    _splitRatio = -1;
    _splitMinHorizontal = -1;
    _splitIdealHorizontal = -1;
    _splitMaxHorizontal = -1;
    _splitMinVertical = -1;
    _splitIdealVertical = -1;
    _splitMaxVertical = -1;
    _splitMinWidth = -1;
    _splitIdealWidth = -1;
    _splitMaxWidth = -1;
    _splitMinHeight = -1;
    _splitIdealHeight = -1;
    _splitMaxHeight = -1;
    _splitFixedHorizontal = NO;
    _splitFixedVertical = NO;
    _overlayEdge = @"";
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeArrangementSlotProps>(props);
  NSString *placement = RCTNSStringFromString(next.placement);
  NSString *overlayEdge = RCTNSStringFromString(next.overlayEdge);

  BOOL changed = ![self.placement isEqualToString:placement] ||
    self.splitRatio != next.splitRatio ||
    self.splitMinHorizontal != next.splitMinHorizontal ||
    self.splitIdealHorizontal != next.splitIdealHorizontal ||
    self.splitMaxHorizontal != next.splitMaxHorizontal ||
    self.splitMinVertical != next.splitMinVertical ||
    self.splitIdealVertical != next.splitIdealVertical ||
    self.splitMaxVertical != next.splitMaxVertical ||
    self.splitMinWidth != next.splitMinWidth ||
    self.splitIdealWidth != next.splitIdealWidth ||
    self.splitMaxWidth != next.splitMaxWidth ||
    self.splitMinHeight != next.splitMinHeight ||
    self.splitIdealHeight != next.splitIdealHeight ||
    self.splitMaxHeight != next.splitMaxHeight ||
    self.splitFixedHorizontal != next.splitFixedHorizontal ||
    self.splitFixedVertical != next.splitFixedVertical ||
    ![self.overlayEdge isEqualToString:overlayEdge];

  self.placement = placement;
  self.splitRatio = next.splitRatio;
  self.splitMinHorizontal = next.splitMinHorizontal;
  self.splitIdealHorizontal = next.splitIdealHorizontal;
  self.splitMaxHorizontal = next.splitMaxHorizontal;
  self.splitMinVertical = next.splitMinVertical;
  self.splitIdealVertical = next.splitIdealVertical;
  self.splitMaxVertical = next.splitMaxVertical;
  self.splitMinWidth = next.splitMinWidth;
  self.splitIdealWidth = next.splitIdealWidth;
  self.splitMaxWidth = next.splitMaxWidth;
  self.splitMinHeight = next.splitMinHeight;
  self.splitIdealHeight = next.splitIdealHeight;
  self.splitMaxHeight = next.splitMaxHeight;
  self.splitFixedHorizontal = next.splitFixedHorizontal;
  self.splitFixedVertical = next.splitFixedVertical;
  self.overlayEdge = overlayEdge;

  if (changed) [self.arrangementHost invalidatePanes];
  [super updateProps:props oldProps:oldProps];
}

- (void)updateState:(State::Shared const &)state oldState:(State::Shared const &)oldState {
  _slotState = std::static_pointer_cast<const OneNativeArrangementSlotShadowNode::ConcreteState>(state);
}

- (void)updateNativeFrame:(CGRect)frame {
  if (!_slotState || !std::isfinite(frame.size.width) || !std::isfinite(frame.size.height)) return;
  const auto &old = _slotState->getData();
  const facebook::react::Size size{(Float)frame.size.width, (Float)frame.size.height};
  const facebook::react::Point origin{(Float)frame.origin.x, (Float)frame.origin.y};
  if (old.measured && old.size == size && old.origin == origin) return;
  OneNativeArrangementSlotState data;
  data.size = size;
  data.origin = origin;
  data.measured = true;
  _slotState->updateState(std::move(data));
}

- (void)updateLayoutMetrics:(LayoutMetrics const &)layoutMetrics oldLayoutMetrics:(LayoutMetrics const &)oldLayoutMetrics {
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  self.frame = (CGRect){CGPointZero, self.bounds.size};
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  self.arrangementHost = nil;
  _slotState.reset();
  _placement = @"primary";
  _splitRatio = -1;
  _splitMinHorizontal = -1;
  _splitIdealHorizontal = -1;
  _splitMaxHorizontal = -1;
  _splitMinVertical = -1;
  _splitIdealVertical = -1;
  _splitMaxVertical = -1;
  _splitMinWidth = -1;
  _splitIdealWidth = -1;
  _splitMaxWidth = -1;
  _splitMinHeight = -1;
  _splitIdealHeight = -1;
  _splitMaxHeight = -1;
  _splitFixedHorizontal = NO;
  _splitFixedVertical = NO;
  _overlayEdge = @"";
}

@end
