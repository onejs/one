#include "OneMacButtonProps.h"
#include <react/renderer/core/propsConversions.h>
namespace facebook::react {
OneMacButtonProps::OneMacButtonProps(const PropsParserContext &context, const OneMacButtonProps &sourceProps, const RawProps &rawProps)
    : ViewProps(context, sourceProps, rawProps),
      title(convertRawProp(context, rawProps, "title", sourceProps.title, std::string{})),
      systemImage(convertRawProp(context, rawProps, "systemImage", sourceProps.systemImage, std::string{})),
      disabled(convertRawProp(context, rawProps, "disabled", sourceProps.disabled, false)),
      bordered(convertRawProp(context, rawProps, "bordered", sourceProps.bordered, true)) {}
}
