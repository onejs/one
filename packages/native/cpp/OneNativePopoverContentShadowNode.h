#pragma once
#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include <react/renderer/components/OneNativeSpec/Props.h>
#include "OneNativeSlotShadowNode.h"
namespace facebook::react {
extern const char OneNativePopoverContentComponentName[];
using OneNativePopoverContentShadowNode = OneNativeSlotShadowNode<OneNativePopoverContentComponentName, OneNativePopoverContentProps, OneNativePopoverContentEventEmitter>;
using OneNativePopoverContentComponentDescriptor = OneNativeSlotComponentDescriptor<OneNativePopoverContentShadowNode>;
}
#endif
