#pragma once

#include "OneMacPopUpButtonEventEmitter.h"
#include "OneMacPopUpButtonProps.h"

#include <react/renderer/components/view/ConcreteViewShadowNode.h>

namespace facebook::react {

extern const char OneMacPopUpButtonComponentName[];

// leaf layout uses the system control font and standard AppKit control insets
class OneMacPopUpButtonShadowNode final
    : public ConcreteViewShadowNode<OneMacPopUpButtonComponentName, OneMacPopUpButtonProps, OneMacPopUpButtonEventEmitter> {
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
