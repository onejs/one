#pragma once

#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/Props.h>
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include "OneNativeSlotShadowNode.h"

namespace facebook::react {
extern const char OneNativeTabComponentName[];
using OneNativeTabState = OneNativeSlotState;
using OneNativeTabShadowNode = OneNativeSlotShadowNode<OneNativeTabComponentName, OneNativeTabProps, OneNativeTabEventEmitter>;
using OneNativeTabComponentDescriptor = OneNativeSlotComponentDescriptor<OneNativeTabShadowNode>;
}
#endif
