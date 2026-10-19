#pragma once
#ifdef __cplusplus

#include <algorithm>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>

namespace facebook::react {

struct OneNativeSlotState {
  Size size{};
  Point origin{};
  bool measured = false;
  // the extent Yoga laid the children out to, which a presented slot sizes to
  Size content{};
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

// presented content sizes its presentation to the children's layout. it reads the shadow
// tree because view flattening drops a layout-only root, with its size and padding, from
// the mounted views.
template <const char *Name, typename Props, typename EventEmitter>
class OneNativePresentedSlotShadowNode final : public ConcreteViewShadowNode<Name, Props, EventEmitter, OneNativeSlotState> {
 public:
  using Base = ConcreteViewShadowNode<Name, Props, EventEmitter, OneNativeSlotState>;
  using Base::Base;
  Point getContentOriginOffset(bool /*includeTransform*/) const override {
    return this->getStateData().origin;
  }
  void layout(LayoutContext layoutContext) override {
    Base::layout(layoutContext);
    Size content{};
    for (const auto &child : this->getLayoutableChildNodes()) {
      const auto &metrics = child->getLayoutMetrics();
      if (metrics.displayType == DisplayType::None) continue;
      content.width = std::max(content.width, metrics.frame.origin.x + metrics.frame.size.width);
      content.height = std::max(content.height, metrics.frame.origin.y + metrics.frame.size.height);
    }
    auto data = this->getStateData();
    if (data.content == content) return;
    data.content = content;
    this->setStateData(std::move(data));
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
