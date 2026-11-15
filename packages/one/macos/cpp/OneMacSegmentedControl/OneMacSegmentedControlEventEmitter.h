#pragma once
#include <react/renderer/components/view/ViewEventEmitter.h>
namespace facebook::react {
class OneMacSegmentedControlEventEmitter : public ViewEventEmitter {
 public:
  using ViewEventEmitter::ViewEventEmitter;
  struct OnChange {
    int selectedIndex;
    int eventCount;
    int revision;
  };
  void onChange(const OnChange &) const;
};
}
