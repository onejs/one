#pragma once
#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include <react/renderer/components/OneNativeSpec/Props.h>
#include "OneNativeMeasuredShadowNode.h"
namespace facebook::react {
extern const char OneNativeZStackComponentName[];
using OneNativeZStackShadowNode = OneNativeMeasuredShadowNode<OneNativeZStackComponentName, OneNativeZStackProps, OneNativeZStackEventEmitter>;
using OneNativeZStackComponentDescriptor = OneNativeMeasuredComponentDescriptor<OneNativeZStackShadowNode>;
}
#endif
