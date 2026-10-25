#pragma once

#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/core/LayoutConstraints.h>

namespace facebook::react {

// gtk measures on the main thread; fabric consumes the immutable result.
struct OneLinuxControlState {
  Size size{};
};

template <const char *Name, typename Props, typename Emitter>
class OneLinuxMeasuredControlShadowNode final
    : public ConcreteViewShadowNode<Name, Props, Emitter, OneLinuxControlState> {
 public:
  using Base = ConcreteViewShadowNode<Name, Props, Emitter, OneLinuxControlState>;
  using Base::Base;

  OneLinuxMeasuredControlShadowNode(const ShadowNode &source, const ShadowNodeFragment &fragment)
      : Base(source, fragment)
  {
    if (this->getState() != source.getState()) {
      this->dirtyLayout();
    }
  }

  static ShadowNodeTraits BaseTraits()
  {
    auto traits = Base::BaseTraits();
    traits.set(ShadowNodeTraits::Trait::LeafYogaNode);
    traits.set(ShadowNodeTraits::Trait::MeasurableYogaNode);
    return traits;
  }

  Size measureContent(const LayoutContext &, const LayoutConstraints &constraints) const override
  {
    return constraints.clamp(this->getStateData().size);
  }
};

} // namespace facebook::react
