#include "OneMacImageProps.h"
#include <react/renderer/core/propsConversions.h>
#include <react/renderer/core/graphicsConversions.h>
namespace facebook::react {
OneMacImageProps::OneMacImageProps(const PropsParserContext &context, const OneMacImageProps &sourceProps, const RawProps &rawProps)
    : ViewProps(context, sourceProps, rawProps),
      systemName(convertRawProp(context, rawProps, "systemName", sourceProps.systemName, std::string{})),
      size(convertRawProp(context, rawProps, "size", sourceProps.size, Float{16})),
      fitToBounds(convertRawProp(context, rawProps, "fitToBounds", sourceProps.fitToBounds, false)),
      tintColor(convertRawProp(context, rawProps, "tintColor", sourceProps.tintColor, SharedColor{})) {}
}
