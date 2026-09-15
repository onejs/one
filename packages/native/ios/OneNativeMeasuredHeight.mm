#include <cmath>
#import "OneNativeMeasuredHeight.h"
#import "OneNativeMeasuredShadowNode.h"

using namespace facebook::react;

@implementation OneNativeMeasuredHeight {
  ConcreteState<OneNativeMeasuredState>::Shared _state;
}

- (void)adopt:(State::Shared const &)state {
  _state = std::static_pointer_cast<const ConcreteState<OneNativeMeasuredState>>(state);
}

- (void)update:(CGFloat)height {
  if (!_state || !std::isfinite(height)) return;
  const auto &old = _state->getData();
  // sub-half-point churn would spin the shadow tree without changing what is drawn.
  if (old.measured && std::abs(old.height - (Float)height) < 0.5) return;
  OneNativeMeasuredState data;
  data.height = (Float)height;
  data.measured = true;
  _state->updateState(std::move(data));
}

- (void)reset {
  _state.reset();
}

@end
