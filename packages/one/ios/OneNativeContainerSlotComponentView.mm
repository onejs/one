#include <cmath>
#import "OneNativeContainerSlotComponentView.h"
#import "OneNativeContainerComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import "OneNativeContainerStyle.h"
#import "OneNativeContainerSlotShadowNode.h"

using namespace facebook::react;

@implementation OneNativeContainerSlotComponentView {
  OneNativeContainerSlotShadowNode::ConcreteState::Shared _state;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeContainerSlotComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeContainerSlotProps>();
    _slotView = [OneNativeContainerSlotView new];
    _slotView.content = self;
    __weak OneNativeContainerSlotComponentView *weakSelf = self;
    _slotView.onSwiftStyleEvent = ^(NSString *name, NSString *value) {
      OneNativeContainerSlotComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeContainerSlotEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeSDKEvent({.name = std::string(name.UTF8String), .value = std::string(value.UTF8String)});
    };
    _slotView.onLayout = ^(CGRect layout) {
      [weakSelf updateNativeFrame:layout];
    };
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeContainerSlotProps>(props);
  [_slotView configureSwiftStyle:OneNativeStyleDictionary(next.swiftStyle)];
  [_slotView configureWithHeight:next.height width:next.width];
  [super updateProps:props oldProps:oldProps];
}

- (void)updateState:(State::Shared const &)state oldState:(State::Shared const &)oldState {
  _state = std::static_pointer_cast<const OneNativeContainerSlotShadowNode::ConcreteState>(state);
}

- (void)updateNativeFrame:(CGRect)frame {
  if (!_state || !std::isfinite(frame.size.width) || !std::isfinite(frame.size.height) ||
      !std::isfinite(frame.origin.x) || !std::isfinite(frame.origin.y)) return;
  const auto &old = _state->getData();
  const facebook::react::Size size{(Float)frame.size.width, (Float)frame.size.height};
  // fabric already adds the composed ancestors' yoga origins when measuring.
  const auto inherited = (_compositionParent ? [_compositionParent compositionLayoutOrigin] : facebook::react::Point{}) + _layoutMetrics.frame.origin;
  const facebook::react::Point origin{(Float)frame.origin.x - inherited.x, (Float)frame.origin.y - inherited.y};
  if (old.measured && old.size == size && old.origin == origin) return;
  OneNativeSlotState data;
  data.size = size;
  data.origin = origin;
  data.measured = true;
  _state->updateState(std::move(data));
}

- (void)updateLayoutMetrics:(LayoutMetrics const &)layoutMetrics oldLayoutMetrics:(LayoutMetrics const &)oldLayoutMetrics {
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  // SwiftUI owns placement. Fabric owns the slot bounds and the descendants' layout.
  self.frame = (CGRect){CGPointZero, self.bounds.size};
  if (layoutMetrics.frame.origin != oldLayoutMetrics.frame.origin) [self.superview setNeedsLayout];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  [_slotView reset];
  _compositionParent = nil;
  _state.reset();
}

@end
