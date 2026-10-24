#include "OneLinuxSwitchShadowNode.h"

#include <react/renderer/core/LayoutConstraints.h>

namespace facebook::react {

const char OneLinuxSwitchComponentName[] = "OneLinuxSwitch";

// the Adwaita switch track and knob
static constexpr Float kSwitchWidth = 46;
static constexpr Float kSwitchHeight = 26;

Size OneLinuxSwitchShadowNode::measureContent(const LayoutContext &, const LayoutConstraints &layoutConstraints) const
{
  return layoutConstraints.clamp({kSwitchWidth, kSwitchHeight});
}

} // namespace facebook::react
