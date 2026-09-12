#pragma once
#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include <react/renderer/components/OneNativeSpec/Props.h>
#include "OneNativeMeasuredShadowNode.h"
namespace facebook::react {
extern const char OneNativePopoverComponentName[];
using OneNativePopoverShadowNode = OneNativeMeasuredShadowNode<OneNativePopoverComponentName, OneNativePopoverProps, OneNativePopoverEventEmitter>;
using OneNativePopoverComponentDescriptor = OneNativeMeasuredComponentDescriptor<OneNativePopoverShadowNode>;
}
#endif
