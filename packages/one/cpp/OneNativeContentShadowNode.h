#pragma once

#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/Props.h>
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include "OneNativeSlotShadowNode.h"

namespace facebook::react {
extern const char OneNativeContentComponentName[];
// the content lays out at the width UIKit gives its view, with an undefined height so
// yoga sizes it to the children, whose extent becomes the view's height
using OneNativeContentShadowNode = OneNativePresentedSlotShadowNode<OneNativeContentComponentName, OneNativeContentProps, OneNativeContentEventEmitter>;
using OneNativeContentComponentDescriptor = OneNativeSlotComponentDescriptor<OneNativeContentShadowNode>;
}
#endif
