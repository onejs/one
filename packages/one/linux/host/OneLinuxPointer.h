#pragma once

#include <react/renderer/components/view/primitives.h>
#include <react/renderer/core/EventEmitter.h>
#include <react/renderer/core/ReactPrimitives.h>

#include <functional>
#include <memory>
#include <vector>

#include "OneLinuxView.h"

namespace facebook::react {

// what hit testing needs to know about a mounted view
struct OneLinuxPointerTarget {
  Tag tag;
  PointerEventsMode pointerEvents;
  ViewEvents events;
  Cursor cursor;
};

// Feeds the primary mouse button to React Native's own touch events, the same
// path the Mac host uses (a TouchEventEmitter on the view under the pointer),
// so Pressable and the responder system work unchanged. Hit testing walks the
// OneView tree by React's frames, deepest and last sibling first. Moving the
// mouse also sends W3C pointer over, out, enter and leave to the views that
// listen, which is what Pressable's hover callbacks read, and applies the
// `cursor` style of the view under the pointer.
class OneLinuxPointerHandler {
 public:
  using Describe = std::function<bool(OneView *, OneLinuxPointerTarget &)>;
  using EmitterFor = std::function<std::shared_ptr<const EventEmitter>(Tag)>;
  using ViewFor = std::function<OneView *(Tag)>;

  OneLinuxPointerHandler(OneView *surface, Describe describe, EmitterFor emitterFor, ViewFor viewFor);
  ~OneLinuxPointerHandler();

 private:
  static gboolean onEvent(GtkEventControllerLegacy *controller, GdkEvent *event, gpointer data);
  bool handle(GdkEvent *event);
  OneView *hitChildren(OneView *parent, double x, double y, OneLinuxPointerTarget &target, double &localX, double &localY);
  OneView *hitTest(OneView *view, double x, double y, OneLinuxPointerTarget &target, double &localX, double &localY);
  bool localPoint(Tag tag, double x, double y, double &localX, double &localY);
  void send(const char *phase, double x, double y, bool stillDown);
  void updateHover(double x, double y, bool inside);
  void sendPointer(Tag tag, const char *type, double x, double y);

  OneView *surface_;
  GtkEventController *controller_;
  Describe describe_;
  EmitterFor emitterFor_;
  ViewFor viewFor_;

  // what the pointer is over, outermost view first
  struct Hovered {
    Tag tag;
    ViewEvents events;
  };
  std::vector<Hovered> hover_;
  Cursor cursor_{Cursor::Auto};

  bool touching_{false};
  Tag touchTarget_{0};
};

} // namespace facebook::react
