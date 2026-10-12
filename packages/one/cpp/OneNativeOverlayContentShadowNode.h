#pragma once
#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/Props.h>
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include "OneNativeSlotShadowNode.h"
namespace facebook::react {
extern const char OneNativeOverlayContentComponentName[];
using OneNativeOverlayContentShadowNode = OneNativeSlotShadowNode<OneNativeOverlayContentComponentName, OneNativeOverlayContentProps, OneNativeOverlayContentEventEmitter>;
using OneNativeOverlayContentComponentDescriptor = OneNativeSlotComponentDescriptor<OneNativeOverlayContentShadowNode>;
}
#endif
