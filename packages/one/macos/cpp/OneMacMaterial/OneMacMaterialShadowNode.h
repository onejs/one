#pragma once

#include "OneMacMaterialProps.h"

#include <react/renderer/components/view/ConcreteViewShadowNode.h>

namespace facebook::react {

extern const char OneMacMaterialComponentName[];

// a background layer: it lays out like a View and has no event emitter
class OneMacMaterialShadowNode final
    : public ConcreteViewShadowNode<OneMacMaterialComponentName, OneMacMaterialProps> {
 public:
  using ConcreteViewShadowNode::ConcreteViewShadowNode;
};

} // namespace facebook::react
