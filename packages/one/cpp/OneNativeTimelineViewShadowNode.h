#pragma once
#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include <react/renderer/components/OneNativeSpec/Props.h>
#include "OneNativeMeasuredShadowNode.h"
namespace facebook::react {
extern const char OneNativeTimelineViewComponentName[];
using OneNativeTimelineViewShadowNode = OneNativeMeasuredShadowNode<OneNativeTimelineViewComponentName, OneNativeTimelineViewProps, OneNativeTimelineViewEventEmitter>;
using OneNativeTimelineViewComponentDescriptor = OneNativeMeasuredComponentDescriptor<OneNativeTimelineViewShadowNode>;
}
#endif
