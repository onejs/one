#include "OneLinuxPointer.h"

#include <react/renderer/components/view/TouchEventEmitter.h>
#include <react/timing/primitives.h>

#include <cstring>
#include <string>
#include <vector>

namespace facebook::react {

namespace {

// GTK takes CSS cursor names, which are what the style names come from
const char *cursorName(Cursor cursor)
{
  switch (cursor) {
    case Cursor::Alias: return "alias";
    case Cursor::AllScroll: return "all-scroll";
    case Cursor::Cell: return "cell";
    case Cursor::ColResize: return "col-resize";
    case Cursor::ContextMenu: return "context-menu";
    case Cursor::Copy: return "copy";
    case Cursor::Crosshair: return "crosshair";
    case Cursor::EResize: return "e-resize";
    case Cursor::EWResize: return "ew-resize";
    case Cursor::Grab: return "grab";
    case Cursor::Grabbing: return "grabbing";
    case Cursor::Help: return "help";
    case Cursor::Move: return "move";
    case Cursor::NEResize: return "ne-resize";
    case Cursor::NESWResize: return "nesw-resize";
    case Cursor::NResize: return "n-resize";
    case Cursor::NSResize: return "ns-resize";
    case Cursor::NWResize: return "nw-resize";
    case Cursor::NWSEResize: return "nwse-resize";
    case Cursor::NoDrop: return "no-drop";
    case Cursor::None: return "none";
    case Cursor::NotAllowed: return "not-allowed";
    case Cursor::Pointer: return "pointer";
    case Cursor::Progress: return "progress";
    case Cursor::RowResize: return "row-resize";
    case Cursor::SResize: return "s-resize";
    case Cursor::SEResize: return "se-resize";
    case Cursor::SWResize: return "sw-resize";
    case Cursor::Text: return "text";
    case Cursor::WResize: return "w-resize";
    case Cursor::Wait: return "wait";
    case Cursor::ZoomIn: return "zoom-in";
    case Cursor::ZoomOut: return "zoom-out";
    case Cursor::Auto:
    case Cursor::Default:
    case Cursor::Url: return "default";
  }
  return "default";
}

} // namespace

OneLinuxPointerHandler::OneLinuxPointerHandler(OneView *surface, Describe describe, EmitterFor emitterFor, ViewFor viewFor)
    : surface_(surface), describe_(std::move(describe)), emitterFor_(std::move(emitterFor)), viewFor_(std::move(viewFor))
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
    double childX, childY;
    if (!one_view_map_from_parent(childView, x, y, &childX, &childY)) {
      continue;
    }
    if (OneView *hit = hitTest(childView, childX, childY, target, localX, localY)) {
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

// a window point in the coordinates of the view with `tag`: down from the
// surface through each view's frame and transform, plus the scroll offset where
// the step enters a scroll view's content, the same steps hit testing takes
bool OneLinuxPointerHandler::localPoint(Tag tag, double x, double y, double &localX, double &localY)
{
  OneView *view = viewFor_(tag);
  if (!view) {
    return false;
  }
  std::vector<OneView *> path;
  for (GtkWidget *widget = GTK_WIDGET(view); widget && widget != GTK_WIDGET(surface_); widget = gtk_widget_get_parent(widget)) {
    if (ONE_IS_VIEW(widget)) {
      path.push_back(ONE_VIEW(widget));
    }
  }
  OneView *parent = surface_;
  for (auto step = path.rbegin(); step != path.rend(); ++step) {
    if (one_view_get_scroll_content(parent) == *step) {
      double scrollX, scrollY;
      one_view_get_scroll_offset(parent, &scrollX, &scrollY);
      x += scrollX;
      y += scrollY;
    } else if (!one_view_map_from_parent(*step, x, y, &x, &y)) {
      return false;
    }
    parent = *step;
  }
  localX = x;
  localY = y;
  return true;
}

void OneLinuxPointerHandler::sendPointer(Tag tag, const char *type, double x, double y, int button)
{
  auto emitter = std::static_pointer_cast<const TouchEventEmitter>(emitterFor_(tag));
  if (!emitter) {
    return;
  }
  PointerEvent event{};
  event.pointerId = 1;
  event.pointerType = "mouse";
  event.pressure = touching_ ? 0.5f : 0.0f;
  event.clientPoint = {static_cast<Float>(x), static_cast<Float>(y)};
  event.screenPoint = event.clientPoint;
  double localX = x, localY = y;
  localPoint(tag, x, y, localX, localY);
  event.offsetPoint = {static_cast<Float>(localX), static_cast<Float>(localY)};
  event.width = 1;
  event.height = 1;
  event.buttons = touching_ ? 1 : 0;
  event.button = button;
  event.shiftKey = modifiers_ & GDK_SHIFT_MASK;
  event.ctrlKey = modifiers_ & GDK_CONTROL_MASK;
  event.altKey = modifiers_ & GDK_ALT_MASK;
  event.metaKey = modifiers_ & GDK_META_MASK;
  event.isPrimary = true;
  event.timeStamp = HighResTimeStamp::now();
  if (!std::strcmp(type, "leave")) {
    emitter->onPointerLeave(std::move(event));
  } else if (!std::strcmp(type, "down")) {
    emitter->onPointerDown(std::move(event));
  } else if (!std::strcmp(type, "move")) {
    emitter->onPointerMove(std::move(event));
  } else if (!std::strcmp(type, "up")) {
    emitter->onPointerUp(std::move(event));
  } else if (!std::strcmp(type, "cancel")) {
    emitter->onPointerCancel(std::move(event));
  }
}

// react native synthesizes hover transitions from moves at the current target
// and a single leave when the mouse leaves the surface
void OneLinuxPointerHandler::updateHover(double x, double y, bool inside)
{
  Cursor cursor = Cursor::Auto;
  if (inside) {
    OneLinuxPointerTarget target{};
    double localX = 0, localY = 0;
    if (OneView *hit = hitTest(surface_, x, y, target, localX, localY)) {
      hoverTarget_ = target.tag;
      sendPointer(target.tag, "move", x, y);
      for (GtkWidget *widget = GTK_WIDGET(hit); widget && cursor == Cursor::Auto; widget = gtk_widget_get_parent(widget)) {
        OneLinuxPointerTarget ancestor{};
        if (ONE_IS_VIEW(widget) && describe_(ONE_VIEW(widget), ancestor)) {
          cursor = ancestor.cursor;
        }
      }
    } else if (hoverTarget_) {
      sendPointer(hoverTarget_, "leave", x, y);
      hoverTarget_ = 0;
    }
  } else if (hoverTarget_) {
    sendPointer(hoverTarget_, "leave", x, y);
    hoverTarget_ = 0;
  }
  if (cursor != cursor_) {
    cursor_ = cursor;
    gtk_widget_set_cursor_from_name(GTK_WIDGET(surface_), cursorName(cursor));
  }
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
  double localX = x, localY = y;
  localPoint(touchTarget_, x, y, localX, localY);
  touch.offsetPoint = {static_cast<Float>(localX), static_cast<Float>(localY)};
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
  if (type != GDK_BUTTON_PRESS && type != GDK_BUTTON_RELEASE && type != GDK_MOTION_NOTIFY && type != GDK_GRAB_BROKEN &&
      type != GDK_ENTER_NOTIFY && type != GDK_LEAVE_NOTIFY) {
    return false;
  }
  GtkNative *native = gtk_widget_get_native(GTK_WIDGET(surface_));
  // popovers have their own surface and their event positions are local to it.
  if (!native || gdk_event_get_surface(event) != gtk_native_get_surface(native)) {
    return false;
  }
  if ((type == GDK_ENTER_NOTIFY || type == GDK_LEAVE_NOTIFY) && gdk_crossing_event_get_detail(event) == GDK_NOTIFY_INFERIOR) {
    return false;
  }
  if ((type == GDK_BUTTON_PRESS || type == GDK_BUTTON_RELEASE) && gdk_button_event_get_button(event) != GDK_BUTTON_PRIMARY) {
    return false;
  }

  // event positions are surface coordinates; the surface view sits at the window origin
  double x = 0, y = 0;
  gdk_event_get_position(event, &x, &y);
  double offsetX = 0, offsetY = 0;
  gtk_native_get_surface_transform(native, &offsetX, &offsetY);
  graphene_point_t in = GRAPHENE_POINT_INIT(static_cast<float>(x - offsetX), static_cast<float>(y - offsetY));
  graphene_point_t point;
  if (!gtk_widget_compute_point(GTK_WIDGET(native), GTK_WIDGET(surface_), &in, &point)) {
    return false;
  }
  x = point.x;
  y = point.y;
  modifiers_ = gdk_event_get_modifier_state(event);

  if (type == GDK_MOTION_NOTIFY || type == GDK_ENTER_NOTIFY || type == GDK_LEAVE_NOTIFY) {
    updateHover(x, y, type != GDK_LEAVE_NOTIFY);
  }

  if (type == GDK_BUTTON_PRESS) {
    OneLinuxPointerTarget target{};
    double localX = 0, localY = 0;
    if (!hitTest(surface_, x, y, target, localX, localY)) {
      return false;
    }
    touching_ = true;
    touchTarget_ = target.tag;
    sendPointer(target.tag, "down", x, y, 0);
    send("start", x, y, true);
  } else if (type == GDK_MOTION_NOTIFY) {
    if (touching_) {
      send("move", x, y, true);
    }
  } else if (type == GDK_BUTTON_RELEASE) {
    if (!touching_) {
      return false;
    }
    touching_ = false;
    OneLinuxPointerTarget target{};
    double localX = 0, localY = 0;
    if (hitTest(surface_, x, y, target, localX, localY)) {
      sendPointer(target.tag, "up", x, y, 0);
    }
    if (touchTarget_) {
      send("end", x, y, false);
      touchTarget_ = 0;
    }
  } else if (touching_ && type == GDK_GRAB_BROKEN) {
    touching_ = false;
    sendPointer(touchTarget_, "cancel", x, y);
    send("cancel", x, y, false);
    touchTarget_ = 0;
  }
  return false;
}

} // namespace facebook::react
