#pragma once
#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include <react/renderer/components/OneNativeSpec/Props.h>
#include "OneNativeMeasuredShadowNode.h"
namespace facebook::react {
extern const char OneNativeHostComponentName[];
using OneNativeHostShadowNode = OneNativeMeasuredShadowNode<OneNativeHostComponentName, OneNativeHostProps, OneNativeHostEventEmitter>;
using OneNativeHostComponentDescriptor = OneNativeMeasuredComponentDescriptor<OneNativeHostShadowNode>;
}
#endif
