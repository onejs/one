#include "OneWindowsToggle.h"

#include <folly/dynamic.h>
#include <react/renderer/core/propsConversions.h>

namespace facebook::react {

const char OneWindowsToggleComponentName[] = "OneWindowsToggle";

OneWindowsToggleProps::OneWindowsToggleProps(
    const PropsParserContext &context,
    const OneWindowsToggleProps &sourceProps,
    const RawProps &rawProps)
    : ViewProps(context, sourceProps, rawProps),
      isOn(convertRawProp(context, rawProps, "isOn", sourceProps.isOn, false)),
      revision(convertRawProp(context, rawProps, "revision", sourceProps.revision, 0)),
      acknowledgedEvent(convertRawProp(context, rawProps, "acknowledgedEvent", sourceProps.acknowledgedEvent, 0)),
      label(convertRawProp(context, rawProps, "label", sourceProps.label, std::string())) {}

void OneWindowsToggleEventEmitter::onIsOnChange(bool isOn, int eventCount, int revision) const
{
  dispatchEvent(
      "isOnChange",
      folly::dynamic::object("isOn", isOn)("eventCount", eventCount)("revision", revision),
      RawEvent::Category::Discrete);
}

void OneWindowsToggleEventEmitter::onFocusChange(bool focused) const
{
  dispatchEvent("focusChange", folly::dynamic::object("focused", focused), RawEvent::Category::Discrete);
}

} // namespace facebook::react
