#pragma once
#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/Props.h>
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include "OneNativeSlotShadowNode.h"
namespace facebook::react {
extern const char OneNativeSheetContentComponentName[];
using OneNativeSheetContentShadowNode = OneNativeSlotShadowNode<OneNativeSheetContentComponentName, OneNativeSheetContentProps, OneNativeSheetContentEventEmitter>;
using OneNativeSheetContentComponentDescriptor = OneNativeSlotComponentDescriptor<OneNativeSheetContentShadowNode>;
}
#endif
