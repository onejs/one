#pragma once
#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include <react/renderer/components/OneNativeSpec/Props.h>
#include "OneNativeMeasuredShadowNode.h"
namespace facebook::react {
extern const char OneNativeViewThatFitsComponentName[];
using OneNativeViewThatFitsShadowNode = OneNativeMeasuredShadowNode<OneNativeViewThatFitsComponentName, OneNativeViewThatFitsProps, OneNativeViewThatFitsEventEmitter>;
using OneNativeViewThatFitsComponentDescriptor = OneNativeMeasuredComponentDescriptor<OneNativeViewThatFitsShadowNode>;
}
#endif
