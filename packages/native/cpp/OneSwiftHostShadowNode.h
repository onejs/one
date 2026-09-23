#pragma once
#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include <react/renderer/components/OneNativeSpec/Props.h>
#include "OneNativeMeasuredShadowNode.h"
namespace facebook::react {
extern const char OneSwiftHostComponentName[];
using OneSwiftHostShadowNode = OneNativeMeasuredShadowNode<OneSwiftHostComponentName, OneSwiftHostProps, OneSwiftHostEventEmitter>;
using OneSwiftHostComponentDescriptor = OneNativeMeasuredComponentDescriptor<OneSwiftHostShadowNode>;
}
#endif
