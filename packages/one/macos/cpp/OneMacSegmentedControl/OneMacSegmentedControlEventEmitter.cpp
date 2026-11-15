#include "OneMacSegmentedControlEventEmitter.h"
#include <folly/dynamic.h>
namespace facebook::react {
void OneMacSegmentedControlEventEmitter::onChange(const OnChange &event) const {
  dispatchEvent("selectedIndexChange", folly::dynamic::object("selectedIndex", event.selectedIndex)("eventCount", event.eventCount)("revision", event.revision), RawEvent::Category::Discrete);
}
}
