#pragma once
#ifdef __cplusplus

#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>

namespace facebook::react {

// a measured container measures its own SwiftUI content on the main thread and pushes
// the height here. it carries no width: the parent still owns that axis.
struct OneNativeMeasuredState {
  Float height = 0;
  bool measured = false;
};

template <const char *Name, typename Props, typename EventEmitter>
class OneNativeMeasuredShadowNode final
    : public ConcreteViewShadowNode<Name, Props, EventEmitter, OneNativeMeasuredState> {
 public:
  using Base = ConcreteViewShadowNode<Name, Props, EventEmitter, OneNativeMeasuredState>;
  using Base::Base;

  // unlike setSize this pins only the measured axis, so a container still stretches or
  // shrinks to whatever width its parent gives it.
  void setMeasuredHeight(Float height) const {
    this->ensureUnsealed();
    auto style = this->yogaNode_.style();
    style.setDimension(yoga::Dimension::Height, yoga::StyleSizeLength::points(height));
    this->yogaNode_.setStyle(style);
    this->yogaNode_.setDirty(true);
  }
};

template <typename Node>
class OneNativeMeasuredComponentDescriptor final : public ConcreteComponentDescriptor<Node> {
 public:
  using ConcreteComponentDescriptor<Node>::ConcreteComponentDescriptor;
  void adopt(ShadowNode &node) const override {
    auto &measured = static_cast<Node &>(node);
    const auto &data = measured.getStateData();
    if (data.measured) measured.setMeasuredHeight(data.height);
    ConcreteComponentDescriptor<Node>::adopt(node);
  }
};

}

#endif
