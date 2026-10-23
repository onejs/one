#pragma once
#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/PropsParserContext.h>
#include <string>
#include <vector>
namespace facebook::react {
class OneMacSegmentedControlProps final : public ViewProps {
 public:
  OneMacSegmentedControlProps() = default;
  OneMacSegmentedControlProps(const PropsParserContext &, const OneMacSegmentedControlProps &, const RawProps &);
  std::vector<std::string> labels{};
  int selectedIndex{-1};
  bool disabled{false};
  int revision{0};
  int acknowledgedEvent{0};
};
}
