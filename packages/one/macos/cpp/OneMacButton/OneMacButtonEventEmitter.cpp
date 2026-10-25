#include "OneMacButtonEventEmitter.h"
#include <folly/dynamic.h>
namespace facebook::react {
void OneMacButtonEventEmitter::onPress(const OnPress &event) const {
  dispatchEvent("buttonPress", folly::dynamic::object(), RawEvent::Category::Discrete);
}
}
