#include "OneLinuxSwitchProps.h"

#include <react/renderer/core/propsConversions.h>

namespace facebook::react {

OneLinuxSwitchProps::OneLinuxSwitchProps(
    const PropsParserContext &context,
    const OneLinuxSwitchProps &sourceProps,
    const RawProps &rawProps)
    : ViewProps(context, sourceProps, rawProps),
      isOn(convertRawProp(context, rawProps, "isOn", sourceProps.isOn, false)),
      revision(convertRawProp(context, rawProps, "revision", sourceProps.revision, 0)),
      acknowledgedEvent(convertRawProp(context, rawProps, "acknowledgedEvent", sourceProps.acknowledgedEvent, 0)) {}

} // namespace facebook::react
