#pragma once

#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/components/view/ViewEventEmitter.h>
#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>

namespace facebook::react {

// the value and event acknowledgement protocol is shared by the GTK controls.
class OneLinuxControlProps final : public ViewProps {
 public:
  OneLinuxControlProps() = default;
  OneLinuxControlProps(const PropsParserContext &, const OneLinuxControlProps &, const RawProps &);

  std::string title;
  std::string text;
  std::string prompt;
  std::vector<std::string> labels;
  double value{0};
  double minimumValue{0};
  double maximumValue{1};
  double step{0.01};
  bool disabled{false};
  int revision{0};
  int acknowledgedEvent{0};
};

class OneLinuxControlEventEmitter : public ViewEventEmitter {
 public:
  using ViewEventEmitter::ViewEventEmitter;
  void onControlChange(double value, int eventCount, int revision) const;
  void onTextChange(const std::string &text, int eventCount, int revision) const;
  void onSubmit(int revision) const;
};

inline constexpr char OneLinuxButtonName[] = "OneLinuxButton";
inline constexpr char OneLinuxSegmentedControlName[] = "OneLinuxSegmentedControl";
inline constexpr char OneLinuxSliderName[] = "OneLinuxSlider";
inline constexpr char OneLinuxDropDownName[] = "OneLinuxDropDown";
inline constexpr char OneLinuxProgressBarName[] = "OneLinuxProgressBar";
inline constexpr char OneLinuxToggleName[] = "OneLinuxToggle";
inline constexpr char OneLinuxStepperName[] = "OneLinuxStepper";
inline constexpr char OneLinuxTextFieldName[] = "OneLinuxTextField";
inline constexpr char OneLinuxSecureFieldName[] = "OneLinuxSecureField";

template <const char *Name>
class OneLinuxControlShadowNode final
    : public ConcreteViewShadowNode<Name, OneLinuxControlProps, OneLinuxControlEventEmitter> {
 public:
  using Base = ConcreteViewShadowNode<Name, OneLinuxControlProps, OneLinuxControlEventEmitter>;
  using Base::Base;

  static ShadowNodeTraits BaseTraits()
  {
    auto traits = Base::BaseTraits();
    traits.set(ShadowNodeTraits::Trait::LeafYogaNode);
    return traits;
  }
};

using OneLinuxButtonShadowNode = OneLinuxControlShadowNode<OneLinuxButtonName>;
using OneLinuxSegmentedControlShadowNode = OneLinuxControlShadowNode<OneLinuxSegmentedControlName>;
using OneLinuxSliderShadowNode = OneLinuxControlShadowNode<OneLinuxSliderName>;
using OneLinuxDropDownShadowNode = OneLinuxControlShadowNode<OneLinuxDropDownName>;
using OneLinuxProgressBarShadowNode = OneLinuxControlShadowNode<OneLinuxProgressBarName>;
using OneLinuxToggleShadowNode = OneLinuxControlShadowNode<OneLinuxToggleName>;
using OneLinuxStepperShadowNode = OneLinuxControlShadowNode<OneLinuxStepperName>;
using OneLinuxTextFieldShadowNode = OneLinuxControlShadowNode<OneLinuxTextFieldName>;
using OneLinuxSecureFieldShadowNode = OneLinuxControlShadowNode<OneLinuxSecureFieldName>;

} // namespace facebook::react
