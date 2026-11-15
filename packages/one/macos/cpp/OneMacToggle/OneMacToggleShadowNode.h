#pragma once

#include "OneMacToggleEventEmitter.h"
#include "OneMacToggleProps.h"

#include <react/renderer/components/view/ConcreteViewShadowNode.h>

namespace facebook::react {

extern const char OneMacToggleComponentName[];

// a leaf node: SwiftUI sizes the control, so layout measures it with the same
// label font the switch style uses
class OneMacToggleShadowNode final
    : public ConcreteViewShadowNode<OneMacToggleComponentName, OneMacToggleProps, OneMacToggleEventEmitter> {
 public:
  using ConcreteViewShadowNode::ConcreteViewShadowNode;

  static ShadowNodeTraits BaseTraits() {
    auto traits = ConcreteViewShadowNode::BaseTraits();
    traits.set(ShadowNodeTraits::Trait::LeafYogaNode);
    traits.set(ShadowNodeTraits::Trait::MeasurableYogaNode);
    return traits;
  }

  Size measureContent(const LayoutContext &layoutContext, const LayoutConstraints &layoutConstraints) const override;
};

} // namespace facebook::react
