#include "OneLinuxPointer.h"

#include <react/renderer/components/view/TouchEventEmitter.h>
#include <react/timing/primitives.h>

#include <cstring>

namespace facebook::react {

OneLinuxPointerHandler::OneLinuxPointerHandler(OneView *surface, Describe describe, EmitterFor emitterFor)
    : surface_(surface), describe_(std::move(describe)), emitterFor_(std::move(emitterFor))
{
  // capture phase and never claims the event, so controls inside a view (the
  // switch) still get their own clicks
  controller_ = gtk_event_controller_legacy_new();
  gtk_event_controller_set_propagation_phase(controller_, GTK_PHASE_CAPTURE);
  g_signal_connect(controller_, "event", G_CALLBACK(onEvent), this);
  gtk_widget_add_controller(GTK_WIDGET(surface_), controller_);
}

OneLinuxPointerHandler::~OneLinuxPointerHandler()
{
  g_signal_handlers_disconnect_by_data(controller_, this);
  g_object_ref(controller_);
  gtk_widget_remove_controller(GTK_WIDGET(surface_), controller_);
  g_object_unref(controller_);
}

gboolean OneLinuxPointerHandler::onEvent(GtkEventControllerLegacy *, GdkEvent *event, gpointer data)
{
  return static_cast<OneLinuxPointerHandler *>(data)->handle(event);
}

OneView *OneLinuxPointerHandler::hitChildren(
    OneView *parent,
    double x,
    double y,
    OneLinuxPointerTarget &target,
    double &localX,
    double &localY)
{
  GtkWidget *control = one_view_get_control(parent);
  for (GtkWidget *child = gtk_widget_get_last_child(GTK_WIDGET(parent)); child; child = gtk_widget_get_prev_sibling(child)) {
    if (child == control) {
      continue;
    }
    OneView *childView = ONE_VIEW(child);
    double childX, childY, childWidth, childHeight;
    one_view_get_frame(childView, &childX, &childY, &childWidth, &childHeight);
    if (OneView *hit = hitTest(childView, x - childX, y - childY, target, localX, localY)) {
      return hit;
    }
  }
  return nullptr;
}

OneView *OneLinuxPointerHandler::hitTest(
    OneView *view,
    double x,
    double y,
    OneLinuxPointerTarget &target,
    double &localX,
    double &localY)
{
  double frameX, frameY, width, height;
  one_view_get_frame(view, &frameX, &frameY, &width, &height);
  OneLinuxPointerTarget self{};
  // the surface view holds the root but is no React view
  bool known = describe_(view, self);
  bool inside = !known || (x >= 0 && y >= 0 && x < width && y < height);

  PointerEventsMode mode = known ? self.pointerEvents : PointerEventsMode::Auto;
  if (mode == PointerEventsMode::None) {
    return nullptr;
  }

  if (mode != PointerEventsMode::BoxOnly && (inside || (!one_view_get_clips(view) && !one_view_get_scroll_content(view)))) {
    if (OneView *content = one_view_get_scroll_content(view)) {
      double scrollX, scrollY;
      one_view_get_scroll_offset(view, &scrollX, &scrollY);
      if (OneView *hit = hitChildren(content, x + scrollX, y + scrollY, target, localX, localY)) {
        return hit;
      }
    } else if (OneView *hit = hitChildren(view, x, y, target, localX, localY)) {
      return hit;
    }
  }

  if (known && inside && mode != PointerEventsMode::BoxNone) {
    target = self;
    localX = x;
    localY = y;
    return view;
  }
  return nullptr;
}

void OneLinuxPointerHandler::send(const char *phase, double x, double y, bool stillDown)
{
  auto emitter = std::static_pointer_cast<const TouchEventEmitter>(emitterFor_(touchTarget_));
  if (!emitter) {
    return;
  }
  Touch touch;
  touch.target = touchTarget_;
  touch.pagePoint = {static_cast<Float>(x), static_cast<Float>(y)};
  touch.offsetPoint = {static_cast<Float>(x - targetOriginX_), static_cast<Float>(y - targetOriginY_)};
  // wayland gives clients no global position, so the screen point is the window point
  touch.screenPoint = touch.pagePoint;
  touch.identifier = 0;
  touch.force = stillDown ? 1.0f : 0.0f;
  touch.timestamp = static_cast<Float>(g_get_monotonic_time() / 1e6);
  touch.timeStamp = HighResTimeStamp::now();

  TouchEvent event;
  event.changedTouches.insert(touch);
  if (stillDown) {
    event.touches.insert(touch);
    event.targetTouches.insert(touch);
  }
  if (!std::strcmp(phase, "start")) {
    emitter->onTouchStart(std::move(event));
  } else if (!std::strcmp(phase, "move")) {
    emitter->onTouchMove(std::move(event));
  } else if (!std::strcmp(phase, "end")) {
    emitter->onTouchEnd(std::move(event));
  } else {
    emitter->onTouchCancel(std::move(event));
  }
}

bool OneLinuxPointerHandler::handle(GdkEvent *event)
{
  GdkEventType type = gdk_event_get_event_type(event);
  if (type != GDK_BUTTON_PRESS && type != GDK_BUTTON_RELEASE && type != GDK_MOTION_NOTIFY && type != GDK_GRAB_BROKEN) {
    return false;
  }
  if ((type == GDK_BUTTON_PRESS || type == GDK_BUTTON_RELEASE) && gdk_button_event_get_button(event) != GDK_BUTTON_PRIMARY) {
    return false;
  }

  // event positions are surface coordinates; the surface view sits at the window origin
  double x = 0, y = 0;
  gdk_event_get_position(event, &x, &y);
  GtkNative *native = gtk_widget_get_native(GTK_WIDGET(surface_));
  double offsetX = 0, offsetY = 0;
  gtk_native_get_surface_transform(native, &offsetX, &offsetY);
  graphene_point_t in = GRAPHENE_POINT_INIT(static_cast<float>(x - offsetX), static_cast<float>(y - offsetY));
  graphene_point_t point;
  if (!gtk_widget_compute_point(GTK_WIDGET(native), GTK_WIDGET(surface_), &in, &point)) {
    return false;
  }
  x = point.x;
  y = point.y;

  if (type == GDK_BUTTON_PRESS) {
    OneLinuxPointerTarget target{};
    double localX = 0, localY = 0;
    if (!hitTest(surface_, x, y, target, localX, localY)) {
      return false;
    }
    touching_ = true;
    touchTarget_ = target.tag;
    targetOriginX_ = x - localX;
    targetOriginY_ = y - localY;
    send("start", x, y, true);
  } else if (touching_ && type == GDK_MOTION_NOTIFY) {
    send("move", x, y, true);
  } else if (touching_ && type == GDK_BUTTON_RELEASE) {
    touching_ = false;
    send("end", x, y, false);
  } else if (touching_ && type == GDK_GRAB_BROKEN) {
    touching_ = false;
    send("cancel", x, y, false);
  }
  return false;
}

} // namespace facebook::react
