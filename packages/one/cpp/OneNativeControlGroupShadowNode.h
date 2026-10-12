#pragma once
#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include <react/renderer/components/OneNativeSpec/Props.h>
#include "OneNativeMeasuredShadowNode.h"
namespace facebook::react {
extern const char OneNativeControlGroupComponentName[];
using OneNativeControlGroupShadowNode = OneNativeMeasuredShadowNode<OneNativeControlGroupComponentName, OneNativeControlGroupProps, OneNativeControlGroupEventEmitter, true>;
using OneNativeControlGroupComponentDescriptor = OneNativeMeasuredComponentDescriptor<OneNativeControlGroupShadowNode>;
}
#endif
