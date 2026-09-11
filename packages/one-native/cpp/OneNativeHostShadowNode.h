#pragma once
#ifdef __cplusplus

#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include <react/renderer/components/OneNativeSpec/Props.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>

namespace facebook::react {

extern const char OneNativeHostComponentName[];

// the host measures its own SwiftUI content on the main thread and pushes the height
// here. it carries no width: the parent still owns that axis.
struct OneNativeHostState {
  Float height = 0;
  bool measured = false;
};

class OneNativeHostShadowNode final : public ConcreteViewShadowNode<
    OneNativeHostComponentName,
    OneNativeHostProps,
    OneNativeHostEventEmitter,
    OneNativeHostState> {
 public:
  using Base = ConcreteViewShadowNode<
      OneNativeHostComponentName,
      OneNativeHostProps,
      OneNativeHostEventEmitter,
      OneNativeHostState>;
  using Base::Base;

  // unlike setSize this pins only the measured axis, so a host still stretches or
  // shrinks to whatever width its parent gives it.
  void setMeasuredHeight(Float height) const {
    ensureUnsealed();
    auto style = yogaNode_.style();
    style.setDimension(yoga::Dimension::Height, yoga::StyleSizeLength::points(height));
    yogaNode_.setStyle(style);
    yogaNode_.setDirty(true);
  }
};

class OneNativeHostComponentDescriptor final
    : public ConcreteComponentDescriptor<OneNativeHostShadowNode> {
 public:
  using ConcreteComponentDescriptor::ConcreteComponentDescriptor;
  void adopt(ShadowNode &node) const override {
    auto &host = static_cast<OneNativeHostShadowNode &>(node);
    const auto &data = host.getStateData();
    if (data.measured) host.setMeasuredHeight(data.height);
    ConcreteComponentDescriptor::adopt(node);
  }
};

}

#endif
