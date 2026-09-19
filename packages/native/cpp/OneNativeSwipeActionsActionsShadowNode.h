#pragma once
#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/Props.h>
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include "OneNativeSlotShadowNode.h"
namespace facebook::react {
extern const char OneNativeSwipeActionsActionsComponentName[];
using OneNativeSwipeActionsActionsShadowNode = OneNativeSlotShadowNode<OneNativeSwipeActionsActionsComponentName, OneNativeSwipeActionsActionsProps, OneNativeSwipeActionsActionsEventEmitter>;
using OneNativeSwipeActionsActionsComponentDescriptor = OneNativeSlotComponentDescriptor<OneNativeSwipeActionsActionsShadowNode>;
}
#endif
