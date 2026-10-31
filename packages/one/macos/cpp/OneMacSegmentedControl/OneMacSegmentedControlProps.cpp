#include "OneMacSegmentedControlProps.h"
#include <react/renderer/core/propsConversions.h>
namespace facebook::react {
OneMacSegmentedControlProps::OneMacSegmentedControlProps(const PropsParserContext &context, const OneMacSegmentedControlProps &sourceProps, const RawProps &rawProps)
    : ViewProps(context, sourceProps, rawProps),
      labels(convertRawProp(context, rawProps, "labels", sourceProps.labels, std::vector<std::string>{})),
      selectedIndex(convertRawProp(context, rawProps, "selectedIndex", sourceProps.selectedIndex, -1)),
      disabled(convertRawProp(context, rawProps, "disabled", sourceProps.disabled, false)),
      controlRole(convertRawProp(context, rawProps, "controlRole", sourceProps.controlRole, std::string{"automatic"})),
      revision(convertRawProp(context, rawProps, "revision", sourceProps.revision, 0)),
      acknowledgedEvent(convertRawProp(context, rawProps, "acknowledgedEvent", sourceProps.acknowledgedEvent, 0)) {}
}
