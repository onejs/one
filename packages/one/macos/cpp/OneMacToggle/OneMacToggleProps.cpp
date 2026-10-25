#include "OneMacToggleProps.h"

#include <react/renderer/core/propsConversions.h>

namespace facebook::react {

OneMacToggleProps::OneMacToggleProps(
    const PropsParserContext &context,
    const OneMacToggleProps &sourceProps,
    const RawProps &rawProps)
    : ViewProps(context, sourceProps, rawProps),
      label(convertRawProp(context, rawProps, "label", sourceProps.label, {})),
      isOn(convertRawProp(context, rawProps, "isOn", sourceProps.isOn, false)),
      revision(convertRawProp(context, rawProps, "revision", sourceProps.revision, 0)),
      acknowledgedEvent(convertRawProp(context, rawProps, "acknowledgedEvent", sourceProps.acknowledgedEvent, 0)) {}

} // namespace facebook::react
