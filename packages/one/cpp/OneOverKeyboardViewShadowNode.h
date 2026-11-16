#pragma once

#include "OneOverKeyboardViewState.h"

#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include <react/renderer/components/OneNativeSpec/Props.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <jsi/jsi.h>

namespace facebook::react {

JSI_EXPORT extern const char OneOverKeyboardViewComponentName[];

/*
 * `ShadowNode` for <OneOverKeyboardView> component.
 */
using OneOverKeyboardViewShadowNode = ConcreteViewShadowNode<
    OneOverKeyboardViewComponentName,
    OneOverKeyboardViewProps,
    OneOverKeyboardViewEventEmitter,
    OneOverKeyboardViewState>;

} // namespace facebook::react
