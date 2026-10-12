#pragma once
#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include <react/renderer/components/OneNativeSpec/Props.h>
#include "OneNativeMeasuredShadowNode.h"
namespace facebook::react {
extern const char OneNativeFormComponentName[];
using OneNativeFormShadowNode = OneNativeMeasuredShadowNode<OneNativeFormComponentName, OneNativeFormProps, OneNativeFormEventEmitter>;
using OneNativeFormComponentDescriptor = OneNativeMeasuredComponentDescriptor<OneNativeFormShadowNode>;
}
#endif
