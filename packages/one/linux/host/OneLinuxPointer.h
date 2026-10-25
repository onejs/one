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

// feeds mouse input through react native's touch and pointer event paths.
// hit testing walks the mounted frames, transforms and scroll offsets.
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
  void sendPointer(Tag tag, const char *type, double x, double y, int button = -1);

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
  GdkModifierType modifiers_{};
};

} // namespace facebook::react
