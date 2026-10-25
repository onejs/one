#pragma once

#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/PropsParserContext.h>

#include <string>

namespace facebook::react {

// controlled props: `isOn` is the value React last accepted, `revision` scopes
// it, `acknowledgedEvent` is the highest native event React has processed
class OneMacToggleProps final : public ViewProps {
 public:
  OneMacToggleProps() = default;
  OneMacToggleProps(const PropsParserContext &context, const OneMacToggleProps &sourceProps, const RawProps &rawProps);

  std::string label{};
  bool isOn{false};
  int revision{0};
  int acknowledgedEvent{0};
};

} // namespace facebook::react
