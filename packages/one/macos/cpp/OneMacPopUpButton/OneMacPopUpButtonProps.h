#pragma once
#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/PropsParserContext.h>
#include <string>
#include <vector>
namespace facebook::react {
class OneMacPopUpButtonProps final : public ViewProps {
 public:
  OneMacPopUpButtonProps() = default;
  OneMacPopUpButtonProps(const PropsParserContext &, const OneMacPopUpButtonProps &, const RawProps &);
  std::vector<std::string> labels{};
  int selectedIndex{-1};
  bool disabled{false};
  int revision{0};
  int acknowledgedEvent{0};
};
}
