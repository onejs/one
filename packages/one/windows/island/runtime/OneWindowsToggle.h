#pragma once

#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/components/view/ViewEventEmitter.h>
#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>
#include <react/renderer/core/PropsParserContext.h>

#include <string>

namespace facebook::react {

// The WinUI ToggleSwitch the host mounts in a child content island. Its props
// follow the controlled protocol of the Mac and Linux controls: `isOn` is the
// value React last accepted, `revision` scopes it, `acknowledgedEvent` is the
// highest native event React has processed. `label` is the switch's header.
class OneWindowsToggleProps final : public ViewProps {
 public:
  OneWindowsToggleProps() = default;
  OneWindowsToggleProps(
      const PropsParserContext &context,
      const OneWindowsToggleProps &sourceProps,
      const RawProps &rawProps);

  bool isOn{false};
  int revision{0};
  int acknowledgedEvent{0};
  std::string label;
};

class OneWindowsToggleEventEmitter : public ViewEventEmitter {
 public:
  using ViewEventEmitter::ViewEventEmitter;

  // topIsOnChange, React's onIsOnChange
  void onIsOnChange(bool isOn, int eventCount, int revision) const;
  // topFocusChange, React's onFocusChange
  void onFocusChange(bool focused) const;
};

extern const char OneWindowsToggleComponentName[];

// a leaf: React gives the island its size, and WinUI lays the switch out in it
class OneWindowsToggleShadowNode final : public ConcreteViewShadowNode<
                                             OneWindowsToggleComponentName,
                                             OneWindowsToggleProps,
                                             OneWindowsToggleEventEmitter> {
 public:
  using ConcreteViewShadowNode::ConcreteViewShadowNode;

  static ShadowNodeTraits BaseTraits()
  {
    auto traits = ConcreteViewShadowNode::BaseTraits();
    traits.set(ShadowNodeTraits::Trait::LeafYogaNode);
    return traits;
  }
};

using OneWindowsToggleComponentDescriptor = ConcreteComponentDescriptor<OneWindowsToggleShadowNode>;

} // namespace facebook::react
