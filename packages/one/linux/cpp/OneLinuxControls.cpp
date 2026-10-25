#include "OneLinuxControls.h"

#include <react/renderer/core/propsConversions.h>

namespace facebook::react {

OneLinuxControlProps::OneLinuxControlProps(
    const PropsParserContext &context, const OneLinuxControlProps &source, const RawProps &raw)
    : ViewProps(context, source, raw),
      title(convertRawProp(context, raw, "title", source.title, std::string{})),
      text(convertRawProp(context, raw, "text", source.text, std::string{})),
      prompt(convertRawProp(context, raw, "prompt", source.prompt, std::string{})),
      labels(convertRawProp(context, raw, "labels", source.labels, std::vector<std::string>{})),
      itemValues(convertRawProp(context, raw, "itemValues", source.itemValues, std::vector<std::string>{})),
      selection(convertRawProp(context, raw, "selection", source.selection, std::string{})),
      value(convertRawProp(context, raw, "value", source.value, 0.0)),
      minimumValue(convertRawProp(context, raw, "minimumValue", source.minimumValue, 0.0)),
      maximumValue(convertRawProp(context, raw, "maximumValue", source.maximumValue, 1.0)),
      step(convertRawProp(context, raw, "step", source.step, 0.01)),
      disabled(convertRawProp(context, raw, "disabled", source.disabled, false)),
      indeterminate(convertRawProp(context, raw, "indeterminate", source.indeterminate, false)),
      tagged(convertRawProp(context, raw, "tagged", source.tagged, false)),
      hasSelection(convertRawProp(context, raw, "hasSelection", source.hasSelection, false)),
      revision(convertRawProp(context, raw, "revision", source.revision, 0)),
      acknowledgedEvent(convertRawProp(context, raw, "acknowledgedEvent", source.acknowledgedEvent, 0)) {}

void OneLinuxControlEventEmitter::onControlChange(double value, int eventCount, int revision) const
{
  dispatchEvent("controlChange", folly::dynamic::object("value", value)("eventCount", eventCount)("revision", revision), RawEvent::Category::Discrete);
}

void OneLinuxControlEventEmitter::onTextChange(const std::string &text, int eventCount, int revision) const
{
  dispatchEvent("textChange", folly::dynamic::object("text", text)("eventCount", eventCount)("revision", revision), RawEvent::Category::Discrete);
}

void OneLinuxControlEventEmitter::onSubmit(int revision) const
{
  dispatchEvent("submit", folly::dynamic::object("revision", revision), RawEvent::Category::Discrete);
}

void OneLinuxControlEventEmitter::onSliding(bool started, double value, int revision) const
{
  dispatchEvent(started ? "slidingStart" : "slidingComplete",
      folly::dynamic::object("value", value)("revision", revision), RawEvent::Category::Discrete);
}

void OneLinuxControlEventEmitter::onSelectionChange(const std::string &selection, bool hasSelection, int eventCount, int revision) const
{
  dispatchEvent("selectionChange", folly::dynamic::object("selection", selection)("hasSelection", hasSelection)("eventCount", eventCount)("revision", revision), RawEvent::Category::Discrete);
}

} // namespace facebook::react
