#pragma once
#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include <react/renderer/components/OneNativeSpec/Props.h>
#include "OneNativeMeasuredShadowNode.h"
namespace facebook::react {
extern const char OneNativeButtonComponentName[];
using OneNativeButtonShadowNode = OneNativeMeasuredShadowNode<OneNativeButtonComponentName, OneNativeButtonProps, OneNativeButtonEventEmitter>;
using OneNativeButtonComponentDescriptor = OneNativeMeasuredComponentDescriptor<OneNativeButtonShadowNode>;
}
#endif
