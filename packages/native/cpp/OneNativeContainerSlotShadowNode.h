#pragma once
#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/Props.h>
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include "OneNativeSlotShadowNode.h"
namespace facebook::react {
extern const char OneNativeContainerSlotComponentName[];
using OneNativeContainerSlotShadowNode = OneNativeSlotShadowNode<OneNativeContainerSlotComponentName, OneNativeContainerSlotProps, OneNativeContainerSlotEventEmitter>;
using OneNativeContainerSlotComponentDescriptor = OneNativeSlotComponentDescriptor<OneNativeContainerSlotShadowNode>;
}
#endif
