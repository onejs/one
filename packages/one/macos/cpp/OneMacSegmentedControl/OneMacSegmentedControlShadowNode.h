#pragma once

#include "OneMacSegmentedControlEventEmitter.h"
#include "OneMacSegmentedControlProps.h"

#include <react/renderer/components/view/ConcreteViewShadowNode.h>

namespace facebook::react {

extern const char OneMacSegmentedControlComponentName[];

// leaf layout uses the system control font and standard AppKit control insets
class OneMacSegmentedControlShadowNode final
    : public ConcreteViewShadowNode<OneMacSegmentedControlComponentName, OneMacSegmentedControlProps, OneMacSegmentedControlEventEmitter> {
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
