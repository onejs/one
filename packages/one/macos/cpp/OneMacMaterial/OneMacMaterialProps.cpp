#include "OneMacMaterialProps.h"
#include <react/renderer/core/propsConversions.h>
namespace facebook::react {
OneMacMaterialProps::OneMacMaterialProps(const PropsParserContext &context, const OneMacMaterialProps &sourceProps, const RawProps &rawProps)
    : ViewProps(context, sourceProps, rawProps),
      material(convertRawProp(context, rawProps, "material", sourceProps.material, std::string{"sidebar"})),
      blending(convertRawProp(context, rawProps, "blending", sourceProps.blending, std::string{"behindWindow"})),
      cornerRadius(convertRawProp(context, rawProps, "cornerRadius", sourceProps.cornerRadius, Float{0})) {}
}
