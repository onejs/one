#pragma once
#ifdef __cplusplus

#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>

namespace facebook::react {

struct OneNativeSlotState {
  Size size{};
  Point origin{};
  bool measured = false;
};

template <const char *Name, typename Props, typename EventEmitter>
class OneNativeSlotShadowNode final : public ConcreteViewShadowNode<Name, Props, EventEmitter, OneNativeSlotState> {
 public:
  using Base = ConcreteViewShadowNode<Name, Props, EventEmitter, OneNativeSlotState>;
  using Base::Base;
  Point getContentOriginOffset(bool /*includeTransform*/) const override {
    return this->getStateData().origin;
  }
};

template <typename Node>
class OneNativeSlotComponentDescriptor final : public ConcreteComponentDescriptor<Node> {
 public:
  using ConcreteComponentDescriptor<Node>::ConcreteComponentDescriptor;
  void adopt(ShadowNode &node) const override {
    auto &slot = static_cast<Node &>(node);
    const auto &data = slot.getStateData();
    if (data.measured) slot.setSize(data.size);
    slot.setPositionType(YGPositionTypeAbsolute);
    ConcreteComponentDescriptor<Node>::adopt(node);
  }
};

}

#endif
