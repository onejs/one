#pragma once
#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/PropsParserContext.h>
#include <string>
namespace facebook::react {
class OneMacMaterialProps final : public ViewProps {
 public:
  OneMacMaterialProps() = default;
  OneMacMaterialProps(const PropsParserContext &, const OneMacMaterialProps &, const RawProps &);
  std::string material{"sidebar"};
  std::string blending{"behindWindow"};
  Float cornerRadius{0};
};
}
