#pragma once
#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/PropsParserContext.h>
#include <string>
#include <vector>
namespace facebook::react {
class OneMacButtonProps final : public ViewProps {
 public:
  OneMacButtonProps() = default;
  OneMacButtonProps(const PropsParserContext &, const OneMacButtonProps &, const RawProps &);
  std::string title{};
  std::string systemImage{};
  bool disabled{false};
  bool bordered{true};
  bool prominent{false};
};
}
