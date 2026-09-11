#include <cmath>
#import "OneNativeMeasuredComponentView.h"
#import "OneNativeMeasuredShadowNode.h"

using namespace facebook::react;

@implementation OneNativeMeasuredComponentView {
  ConcreteState<OneNativeMeasuredState>::Shared _measuredState;
}

- (void)updateState:(State::Shared const &)state oldState:(State::Shared const &)oldState {
  _measuredState = std::static_pointer_cast<const ConcreteState<OneNativeMeasuredState>>(state);
}

- (void)updateMeasuredHeight:(CGFloat)height {
  if (!_measuredState || !std::isfinite(height)) return;
  const auto &old = _measuredState->getData();
  if (old.measured && std::abs(old.height - (Float)height) < 0.5) return;
  OneNativeMeasuredState data;
  data.height = (Float)height;
  data.measured = true;
  _measuredState->updateState(std::move(data));
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  _measuredState.reset();
}

@end
