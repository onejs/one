#pragma once
#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include <react/renderer/components/OneNativeSpec/Props.h>
#include "OneNativeSlotShadowNode.h"
namespace facebook::react {
extern const char OneNativeContextMenuPreviewComponentName[];
using OneNativeContextMenuPreviewShadowNode = OneNativeSlotShadowNode<OneNativeContextMenuPreviewComponentName, OneNativeContextMenuPreviewProps, OneNativeContextMenuPreviewEventEmitter>;
using OneNativeContextMenuPreviewComponentDescriptor = OneNativeSlotComponentDescriptor<OneNativeContextMenuPreviewShadowNode>;
}
#endif
