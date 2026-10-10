#pragma once
#include <react/renderer/components/OneNativeSpec/Props.h>
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>
#include <react/renderer/graphics/Transform.h>
#ifdef ANDROID
#include <folly/dynamic.h>
#endif
namespace facebook::react {
class OnePortalState {
public:
  bool active{false};
  Float hostWidth{0}, hostHeight{0}, offsetX{0}, offsetY{0};
  OnePortalState() = default;
#ifdef ANDROID
  OnePortalState(const OnePortalState &, folly::dynamic data)
      : active(data["active"].getBool()), hostWidth(data["hostWidth"].getDouble()),
        hostHeight(data["hostHeight"].getDouble()), offsetX(data["offsetX"].getDouble()),
        offsetY(data["offsetY"].getDouble()) {}
  folly::dynamic getDynamic() const {
    return folly::dynamic::object("active", active)("hostWidth", hostWidth)
        ("hostHeight", hostHeight)("offsetX", offsetX)("offsetY", offsetY);
  }
#endif
};
extern const char OnePortalComponentName[];
class OnePortalShadowNode : public ConcreteViewShadowNode<OnePortalComponentName,
    OneNativePortalViewProps, OneNativePortalViewEventEmitter, OnePortalState> {
public:
  using ConcreteViewShadowNode::ConcreteViewShadowNode;
  Transform getTransform() const override {
    const auto &data = getStateData();
    return ConcreteViewShadowNode::getTransform() *
        Transform::Translate(data.offsetX, data.offsetY, 0);
  }
};
class OnePortalComponentDescriptor : public ConcreteComponentDescriptor<OnePortalShadowNode> {
public:
  using ConcreteComponentDescriptor::ConcreteComponentDescriptor;
  void adopt(ShadowNode &node) const override {
    auto &portal = static_cast<OnePortalShadowNode &>(node);
    const auto &data = portal.getStateData();
    portal.updateYogaProps();
    if (data.active) {
      portal.setPositionType(YGPositionTypeAbsolute);
      portal.setSize(Size{data.hostWidth, data.hostHeight});
    }
    ConcreteComponentDescriptor::adopt(node);
  }
};
}
