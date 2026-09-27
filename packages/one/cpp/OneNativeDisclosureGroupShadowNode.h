#pragma once
#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include <react/renderer/components/OneNativeSpec/Props.h>
#include "OneNativeMeasuredShadowNode.h"
namespace facebook::react {
extern const char OneNativeDisclosureGroupComponentName[];
using OneNativeDisclosureGroupShadowNode = OneNativeMeasuredShadowNode<OneNativeDisclosureGroupComponentName, OneNativeDisclosureGroupProps, OneNativeDisclosureGroupEventEmitter, true>;
using OneNativeDisclosureGroupComponentDescriptor = OneNativeMeasuredComponentDescriptor<OneNativeDisclosureGroupShadowNode>;
}
#endif
