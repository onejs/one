#pragma once
#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include <react/renderer/components/OneNativeSpec/Props.h>
#include "OneNativeMeasuredShadowNode.h"
namespace facebook::react {
extern const char OneNativeLabeledContentComponentName[];
using OneNativeLabeledContentShadowNode = OneNativeMeasuredShadowNode<OneNativeLabeledContentComponentName, OneNativeLabeledContentProps, OneNativeLabeledContentEventEmitter>;
using OneNativeLabeledContentComponentDescriptor = OneNativeMeasuredComponentDescriptor<OneNativeLabeledContentShadowNode>;
}
#endif
