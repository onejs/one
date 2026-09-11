#include <cmath>
#import "OneNativeContainerSlotComponentView.h"
#import "OneNative-Swift.h"
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
    _slotView.onLayout = ^(CGRect layout) {
      [weakSelf updateNativeFrame:layout];
    };
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeContainerSlotProps>(props);
  [_slotView configureWithHeight:next.height width:next.width];
  [super updateProps:props oldProps:oldProps];
}

- (void)updateState:(State::Shared const &)state oldState:(State::Shared const &)oldState {
  _state = std::static_pointer_cast<const OneNativeContainerSlotShadowNode::ConcreteState>(state);
}

- (void)updateNativeFrame:(CGRect)frame {
  if (!_state || !std::isfinite(frame.size.width) || !std::isfinite(frame.size.height)) return;
  const auto &old = _state->getData();
  const facebook::react::Size size{(Float)frame.size.width, (Float)frame.size.height};
  if (old.measured && old.size == size) return;
  OneNativeSlotState data;
  data.size = size;
  data.measured = true;
  _state->updateState(std::move(data));
}

- (void)updateLayoutMetrics:(LayoutMetrics const &)layoutMetrics oldLayoutMetrics:(LayoutMetrics const &)oldLayoutMetrics {
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  // SwiftUI owns placement. Fabric owns the slot bounds and the descendants' layout.
  self.frame = (CGRect){CGPointZero, self.bounds.size};
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  [_slotView reset];
  _state.reset();
}

@end
