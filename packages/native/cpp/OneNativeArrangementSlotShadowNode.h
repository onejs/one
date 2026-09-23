#pragma once

#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/Props.h>
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include "OneNativeSlotShadowNode.h"

namespace facebook::react {
extern const char OneNativeArrangementSlotComponentName[];
using OneNativeArrangementSlotState = OneNativeSlotState;
using OneNativeArrangementSlotShadowNode = OneNativeSlotShadowNode<OneNativeArrangementSlotComponentName, OneNativeArrangementSlotProps, OneNativeArrangementSlotEventEmitter>;
using OneNativeArrangementSlotComponentDescriptor = OneNativeSlotComponentDescriptor<OneNativeArrangementSlotShadowNode>;
}
#endif
