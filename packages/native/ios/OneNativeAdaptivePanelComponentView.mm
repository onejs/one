#import "OneNativeAdaptivePanelComponentView.h"
#import <React/RCTView.h>
#import "VxrnNative-Swift.h"
#import "OneNativeAdaptivePanelContentShadowNode.h"
#import <React/RCTSurfaceTouchHandler.h>
#import <React/RCTConversions.h>
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include <cmath>
using namespace facebook::react;

@implementation OneNativeAdaptivePanelComponentView { OneNativeAdaptivePanelView *_panel; BOOL _detentsDirty; }
+ (ComponentDescriptorProvider)componentDescriptorProvider { return concreteComponentDescriptorProvider<OneNativeAdaptivePanelComponentDescriptor>(); }
- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeAdaptivePanelProps>();
    _detentsDirty = YES;
    _panel = [OneNativeAdaptivePanelView new]; self.contentView = _panel;
    __weak OneNativeAdaptivePanelComponentView *weakSelf = self;
    _panel.onChange = ^(BOOL value, NSInteger eventCount, NSInteger revision) {
      OneNativeAdaptivePanelComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeAdaptivePanelEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeAdaptivePanelOpenChange({.open = (bool)value, .eventCount = (int)eventCount, .revision = (int)revision});
    };
    _panel.onDetentChange = ^(NSString *type, double value, NSInteger eventCount, NSInteger revision) {
      OneNativeAdaptivePanelComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeAdaptivePanelEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeAdaptivePanelDetentChange({
        .type = std::string(type.UTF8String), .value = value,
        .eventCount = (int)eventCount, .revision = (int)revision
      });
    };
    _panel.onPanelLayout = ^(NSString *placement, CGRect frame) {
      OneNativeAdaptivePanelComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeAdaptivePanelEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeAdaptivePanelLayoutChange({
        .placement = std::string(placement.UTF8String),
        .frameX = (double)frame.origin.x, .frameY = (double)frame.origin.y,
        .frameWidth = (double)frame.size.width, .frameHeight = (double)frame.size.height
      });
    };
  }
  return self;
}
- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  [_panel mountContent:child onLayout:^(CGRect frame) { [(OneNativeAdaptivePanelContentComponentView *)child updateNativeFrame:frame]; }];
}
- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  [_panel unmountContent:child];
}
- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeAdaptivePanelProps>(props);
  const auto &previous = *std::static_pointer_cast<const OneNativeAdaptivePanelProps>(_props);
  bool changed = _detentsDirty || next.compactDetents.size() != previous.compactDetents.size();
  if (!changed) for (size_t i = 0; i < next.compactDetents.size(); i++) {
    if (next.compactDetents[i].type != previous.compactDetents[i].type || next.compactDetents[i].value != previous.compactDetents[i].value) { changed = true; break; }
  }
  if (changed) {
    NSMutableArray *detents = [NSMutableArray new];
    for (const auto &detent : next.compactDetents) [detents addObject:@{@"type": RCTNSStringFromString(detent.type), @"value": @(detent.value)}];
    [_panel setDetents:detents];
    _detentsDirty = NO;
  }
  [_panel configure:next.open acknowledgedEvent:next.acknowledgedEvent revision:next.revision
    selectedDetentType:RCTNSStringFromString(next.selectedDetentType)
    selectedDetentValue:next.selectedDetentValue
    acknowledgedDetentEvent:next.acknowledgedDetentEvent detentRevision:next.detentRevision
    regularWidth:next.regularWidth];
  [super updateProps:props oldProps:oldProps];
}
- (void)prepareForRecycle { [super prepareForRecycle]; [_panel reset]; _detentsDirty = YES; }
@end

@implementation OneNativeAdaptivePanelContentComponentView {
  OneNativeAdaptivePanelContentShadowNode::ConcreteState::Shared _slotState;
  RCTSurfaceTouchHandler *_touchHandler;
}
+ (ComponentDescriptorProvider)componentDescriptorProvider { return concreteComponentDescriptorProvider<OneNativeAdaptivePanelContentComponentDescriptor>(); }
- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeAdaptivePanelContentProps>();
    // presentation leaves the RN surface, as it does for React Native's Modal.
    _touchHandler = [RCTSurfaceTouchHandler new]; [_touchHandler attachToView:self];
  }
  return self;
}
- (void)updateState:(State::Shared const &)state oldState:(State::Shared const &)oldState {
  _slotState = std::static_pointer_cast<const OneNativeAdaptivePanelContentShadowNode::ConcreteState>(state);
}
- (void)updateNativeFrame:(CGRect)frame {
  if (!_slotState || !std::isfinite(frame.size.width) || !std::isfinite(frame.size.height)) return;
  const auto &old = _slotState->getData();
  const facebook::react::Size size{(Float)frame.size.width, (Float)frame.size.height};
  if (old.measured && old.size == size) return;
  OneNativeSlotState state; state.size = size; state.measured = true;
  _slotState->updateState(std::move(state));
}
- (void)updateLayoutMetrics:(LayoutMetrics const &)layoutMetrics oldLayoutMetrics:(LayoutMetrics const &)oldLayoutMetrics {
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  self.frame = (CGRect){CGPointZero, self.bounds.size};
}
- (void)prepareForRecycle {
  [super prepareForRecycle];
  _touchHandler.enabled = NO; _touchHandler.enabled = YES; _slotState.reset();
}
@end
