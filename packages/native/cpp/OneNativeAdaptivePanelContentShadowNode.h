#pragma once
#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/Props.h>
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include "OneNativeSlotShadowNode.h"
namespace facebook::react {
extern const char OneNativeAdaptivePanelContentComponentName[];
using OneNativeAdaptivePanelContentShadowNode = OneNativeSlotShadowNode<OneNativeAdaptivePanelContentComponentName, OneNativeAdaptivePanelContentProps, OneNativeAdaptivePanelContentEventEmitter>;
using OneNativeAdaptivePanelContentComponentDescriptor = OneNativeSlotComponentDescriptor<OneNativeAdaptivePanelContentShadowNode>;
}
#endif
