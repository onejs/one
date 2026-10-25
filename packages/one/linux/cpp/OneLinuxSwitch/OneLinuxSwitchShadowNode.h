#pragma once

#include "OneLinuxSwitchEventEmitter.h"
#include "OneLinuxSwitchProps.h"

#include <OneLinuxControlState.h>

namespace facebook::react {

extern const char OneLinuxSwitchComponentName[];

using OneLinuxSwitchShadowNode = OneLinuxMeasuredControlShadowNode<OneLinuxSwitchComponentName, OneLinuxSwitchProps, OneLinuxSwitchEventEmitter>;

} // namespace facebook::react
