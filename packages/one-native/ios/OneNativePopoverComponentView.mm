#include <cmath>
#import "OneNativePopoverComponentView.h"
#import "OneNative-Swift.h"
#import "OneNativePopoverContentShadowNode.h"
#import "OneNativePopoverShadowNode.h"
#import <React/RCTConversions.h>
#import <React/RCTSurfaceTouchHandler.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>

using namespace facebook::react;

@implementation OneNativePopoverComponentView {
  OneNativePopoverView *_popover;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativePopoverComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativePopoverProps>();
    _popover = [OneNativePopoverView new];
    self.container = _popover;
    self.contentView = _popover;
    __weak OneNativePopoverComponentView *weakSelf = self;
    _popover.onMeasure = ^(CGFloat height) {
      [weakSelf updateMeasuredHeight:height];
    };
    _popover.onChange = ^(BOOL value, NSInteger eventCount, NSInteger revision) {
      OneNativePopoverComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativePopoverEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativePopoverIsPresentedChange({.isPresented = (bool)value, .eventCount = (int)eventCount, .revision = (int)revision});
    };
  }
  return self;
}

// the trigger composes like any other container's children; the body is presented.
- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  if (![child isKindOfClass:OneNativePopoverContentComponentView.class]) {
    [super mountChildComponentView:child index:index];
    return;
  }
  __weak OneNativePopoverContentComponentView *weakContent = (OneNativePopoverContentComponentView *)child;
  [_popover mountContent:child onLayout:^(CGRect frame) { [weakContent updateNativeFrame:frame]; }];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  if (![child isKindOfClass:OneNativePopoverContentComponentView.class]) {
    [super unmountChildComponentView:child index:index];
    return;
  }
  [_popover unmountContent:child];
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativePopoverProps>(props);
  [_popover configure:next.isPresented
       acknowledgedEvent:next.acknowledgedEvent
                revision:next.revision
            contentWidth:next.contentWidth
           contentHeight:next.contentHeight
               arrowEdge:RCTNSStringFromString(next.arrowEdge)
    presentationCompactAdaptation:RCTNSStringFromString(next.presentationCompactAdaptation)];
  [super updateProps:props oldProps:oldProps];
}

@end

@implementation OneNativePopoverContentComponentView {
  OneNativePopoverContentShadowNode::ConcreteState::Shared _slotState;
  RCTSurfaceTouchHandler *_touchHandler;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativePopoverContentComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativePopoverContentProps>();
    // presentation leaves the RN surface, as it does for React Native's Modal.
    _touchHandler = [RCTSurfaceTouchHandler new];
    [_touchHandler attachToView:self];
  }
  return self;
}

- (void)updateState:(State::Shared const &)state oldState:(State::Shared const &)oldState {
  _slotState = std::static_pointer_cast<const OneNativePopoverContentShadowNode::ConcreteState>(state);
}

- (void)updateNativeFrame:(CGRect)frame {
  if (!_slotState || !std::isfinite(frame.size.width) || !std::isfinite(frame.size.height)) return;
  const auto &old = _slotState->getData();
  const facebook::react::Size size{(Float)frame.size.width, (Float)frame.size.height};
  if (old.measured && old.size == size) return;
  OneNativeSlotState state;
  state.size = size;
  state.measured = true;
  _slotState->updateState(std::move(state));
}

- (void)updateLayoutMetrics:(LayoutMetrics const &)layoutMetrics oldLayoutMetrics:(LayoutMetrics const &)oldLayoutMetrics {
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  // SwiftUI owns placement. Fabric owns the bounds and the descendants' layout.
  self.frame = (CGRect){CGPointZero, self.bounds.size};
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  _touchHandler.enabled = NO;
  _touchHandler.enabled = YES;
  _slotState.reset();
}

@end
