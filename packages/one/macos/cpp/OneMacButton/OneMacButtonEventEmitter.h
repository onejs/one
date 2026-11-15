#pragma once
#include <react/renderer/components/view/ViewEventEmitter.h>
namespace facebook::react {
class OneMacButtonEventEmitter : public ViewEventEmitter {
 public:
  using ViewEventEmitter::ViewEventEmitter;
  struct OnPress {
  };
  void onPress(const OnPress &) const;
};
}
