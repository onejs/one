#pragma once

#include <react/renderer/components/view/ViewEventEmitter.h>

namespace facebook::react {

class OneMacToggleEventEmitter : public ViewEventEmitter {
 public:
  using ViewEventEmitter::ViewEventEmitter;

  struct OnIsOnChange {
    bool isOn;
    int eventCount;
    int revision;
  };

  void onIsOnChange(const OnIsOnChange &event) const;
};

} // namespace facebook::react
