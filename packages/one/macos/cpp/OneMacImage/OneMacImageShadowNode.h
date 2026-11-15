#pragma once
#include "OneMacImageProps.h"
#include <react/renderer/components/view/ConcreteViewShadowNode.h>
namespace facebook::react {
extern const char OneMacImageComponentName[];
class OneMacImageShadowNode final
    : public ConcreteViewShadowNode<OneMacImageComponentName, OneMacImageProps, ViewEventEmitter> {
 public:
  using ConcreteViewShadowNode::ConcreteViewShadowNode;
  static ShadowNodeTraits BaseTraits() {
    auto traits = ConcreteViewShadowNode::BaseTraits();
    traits.set(ShadowNodeTraits::Trait::LeafYogaNode);
    traits.set(ShadowNodeTraits::Trait::MeasurableYogaNode);
    return traits;
  }
  Size measureContent(const LayoutContext &, const LayoutConstraints &) const override;
};
}
