#include "OneMacToggleEventEmitter.h"

#include <folly/dynamic.h>

namespace facebook::react {

void OneMacToggleEventEmitter::onIsOnChange(const OnIsOnChange &event) const {
  folly::dynamic payload = folly::dynamic::object("isOn", event.isOn)("eventCount", event.eventCount)(
      "revision", event.revision);
  dispatchEvent("isOnChange", std::move(payload), RawEvent::Category::Discrete);
}

} // namespace facebook::react
