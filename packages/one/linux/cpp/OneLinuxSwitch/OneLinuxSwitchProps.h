#pragma once

#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/PropsParserContext.h>

namespace facebook::react {

// controlled props: `isOn` is the value React last accepted, `revision` scopes
// it, `acknowledgedEvent` is the highest native event React has processed
class OneLinuxSwitchProps final : public ViewProps {
 public:
  OneLinuxSwitchProps() = default;
  OneLinuxSwitchProps(const PropsParserContext &context, const OneLinuxSwitchProps &sourceProps, const RawProps &rawProps);

  bool isOn{false};
  int revision{0};
  int acknowledgedEvent{0};
};

} // namespace facebook::react
