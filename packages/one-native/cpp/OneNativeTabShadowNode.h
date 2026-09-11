#pragma once

#ifdef __cplusplus

#include <react/renderer/components/OneNativeSpec/Props.h>
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>

namespace facebook::react {

struct OneNativeTabState {
  Size size{};
  Point origin{};
  bool measured = false;
};

extern const char OneNativeTabComponentName[];

class OneNativeTabShadowNode final : public ConcreteViewShadowNode<
    OneNativeTabComponentName, OneNativeTabProps, OneNativeTabEventEmitter, OneNativeTabState> {
 public:
  using ConcreteViewShadowNode::ConcreteViewShadowNode;

  Point getContentOriginOffset(bool /*includeTransform*/) const override {
    return getStateData().origin;
  }
};

class OneNativeTabComponentDescriptor final : public ConcreteComponentDescriptor<OneNativeTabShadowNode> {
 public:
  using ConcreteComponentDescriptor::ConcreteComponentDescriptor;

  void adopt(ShadowNode &node) const override {
    auto &tab = static_cast<OneNativeTabShadowNode &>(node);
    const auto &data = tab.getStateData();
    if (data.measured) tab.setSize(data.size);
    tab.setPositionType(YGPositionTypeAbsolute);
    ConcreteComponentDescriptor::adopt(node);
  }
};

}

#endif
