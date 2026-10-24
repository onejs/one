#pragma once

#include <react/renderer/components/view/primitives.h>
#include <react/renderer/core/EventEmitter.h>
#include <react/renderer/core/ReactPrimitives.h>

#include <functional>
#include <memory>

#include "OneLinuxView.h"

namespace facebook::react {

// what hit testing needs to know about a mounted view
struct OneLinuxPointerTarget {
  Tag tag;
  PointerEventsMode pointerEvents;
};

// Feeds the primary mouse button to React Native's own touch events, the same
// path the Mac host uses (a TouchEventEmitter on the view under the pointer),
// so Pressable and the responder system work unchanged. Hit testing walks the
// OneView tree by React's frames, deepest and last sibling first.
class OneLinuxPointerHandler {
 public:
  using Describe = std::function<bool(OneView *, OneLinuxPointerTarget &)>;
  using EmitterFor = std::function<std::shared_ptr<const EventEmitter>(Tag)>;

  OneLinuxPointerHandler(OneView *surface, Describe describe, EmitterFor emitterFor);
  ~OneLinuxPointerHandler();

 private:
  static gboolean onEvent(GtkEventControllerLegacy *controller, GdkEvent *event, gpointer data);
  bool handle(GdkEvent *event);
  OneView *hitTest(OneView *view, double x, double y, OneLinuxPointerTarget &target, double &localX, double &localY);
  void send(const char *phase, double x, double y, bool stillDown);

  OneView *surface_;
  GtkEventController *controller_;
  Describe describe_;
  EmitterFor emitterFor_;

  bool touching_{false};
  Tag touchTarget_{0};
  double targetOriginX_{0};
  double targetOriginY_{0};
};

} // namespace facebook::react
