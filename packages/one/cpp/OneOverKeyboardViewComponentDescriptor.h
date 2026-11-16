#pragma once

#include "OneOverKeyboardViewShadowNode.h"

#include <react/debug/react_native_assert.h>
#include <react/renderer/components/OneNativeSpec/Props.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>

namespace facebook::react {

class OneOverKeyboardViewComponentDescriptor final
    : public ConcreteComponentDescriptor<OneOverKeyboardViewShadowNode> {
 public:
  using ConcreteComponentDescriptor::ConcreteComponentDescriptor;
  void adopt(ShadowNode &shadowNode) const override {
    auto& layoutableShadowNode =
        static_cast<YogaLayoutableShadowNode&>(shadowNode);
    auto& stateData =
        static_cast<const OneOverKeyboardViewShadowNode::ConcreteState&>(
            *shadowNode.getState())
            .getData();

    layoutableShadowNode.setSize(
        Size{stateData.screenSize.width, stateData.screenSize.height});
    layoutableShadowNode.setPositionType(YGPositionTypeAbsolute);

    ConcreteComponentDescriptor::adopt(shadowNode);
  }
};

} // namespace facebook::react
