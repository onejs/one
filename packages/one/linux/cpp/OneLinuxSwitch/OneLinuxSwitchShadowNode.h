#pragma once

#include "OneLinuxSwitchEventEmitter.h"
#include "OneLinuxSwitchProps.h"

#include <react/renderer/components/view/ConcreteViewShadowNode.h>

namespace facebook::react {

extern const char OneLinuxSwitchComponentName[];

// a leaf node: GTK draws the switch at its own size
class OneLinuxSwitchShadowNode final
    : public ConcreteViewShadowNode<OneLinuxSwitchComponentName, OneLinuxSwitchProps, OneLinuxSwitchEventEmitter> {
 public:
  using ConcreteViewShadowNode::ConcreteViewShadowNode;

  static ShadowNodeTraits BaseTraits()
  {
    auto traits = ConcreteViewShadowNode::BaseTraits();
    traits.set(ShadowNodeTraits::Trait::LeafYogaNode);
    traits.set(ShadowNodeTraits::Trait::MeasurableYogaNode);
    return traits;
  }

  Size measureContent(const LayoutContext &layoutContext, const LayoutConstraints &layoutConstraints) const override;
};

} // namespace facebook::react
