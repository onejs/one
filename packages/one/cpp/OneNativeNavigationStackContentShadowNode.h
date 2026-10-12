#pragma once
#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/Props.h>
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include "OneNativeSlotShadowNode.h"
namespace facebook::react {
extern const char OneNativeNavigationStackContentComponentName[];
using OneNativeNavigationStackContentShadowNode = OneNativeSlotShadowNode<OneNativeNavigationStackContentComponentName, OneNativeNavigationStackContentProps, OneNativeNavigationStackContentEventEmitter>;
using OneNativeNavigationStackContentComponentDescriptor = OneNativeSlotComponentDescriptor<OneNativeNavigationStackContentShadowNode>;
}
#endif
