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

void OneLinuxPointerHandler::sendPointer(Tag tag, const char *type, double x, double y)
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
  event.button = -1;
  event.isPrimary = true;
  event.timeStamp = HighResTimeStamp::now();
  if (!std::strcmp(type, "over")) {
    emitter->onPointerOver(std::move(event));
  } else if (!std::strcmp(type, "out")) {
    emitter->onPointerOut(std::move(event));
  } else if (!std::strcmp(type, "enter")) {
    emitter->onPointerEnter(std::move(event));
  } else {
    emitter->onPointerLeave(std::move(event));
  }
}

// moves the hover chain to what is under (x, y): out and leave for the views
// left (innermost first), then over and enter for the views entered
// (outermost first), each only for views that listen
void OneLinuxPointerHandler::updateHover(double x, double y, bool inside)
{
  std::vector<Hovered> chain;
  Cursor cursor = Cursor::Auto;
  if (inside) {
    OneLinuxPointerTarget target{};
    double localX = 0, localY = 0;
    if (OneView *hit = hitTest(surface_, x, y, target, localX, localY)) {
      for (GtkWidget *widget = GTK_WIDGET(hit); widget; widget = gtk_widget_get_parent(widget)) {
        OneLinuxPointerTarget ancestor{};
        if (ONE_IS_VIEW(widget) && describe_(ONE_VIEW(widget), ancestor)) {
          chain.insert(chain.begin(), {ancestor.tag, ancestor.events});
          if (cursor == Cursor::Auto) {
            cursor = ancestor.cursor;
          }
        }
      }
    }
  }

  size_t common = 0;
  while (common < hover_.size() && common < chain.size() && hover_[common].tag == chain[common].tag) {
    common++;
  }
  bool sameTarget = common == hover_.size() && common == chain.size();
  if (!sameTarget) {
    if (!hover_.empty() && hover_.back().events[ViewEvents::Offset::PointerOut]) {
      sendPointer(hover_.back().tag, "out", x, y);
    }
    for (size_t i = hover_.size(); i > common; i--) {
      if (hover_[i - 1].events[ViewEvents::Offset::PointerLeave]) {
        sendPointer(hover_[i - 1].tag, "leave", x, y);
      }
    }
    if (!chain.empty() && chain.back().events[ViewEvents::Offset::PointerOver]) {
      sendPointer(chain.back().tag, "over", x, y);
    }
    for (size_t i = common; i < chain.size(); i++) {
      if (chain[i].events[ViewEvents::Offset::PointerEnter]) {
        sendPointer(chain[i].tag, "enter", x, y);
      }
    }
    hover_ = std::move(chain);
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
  if ((type == GDK_ENTER_NOTIFY || type == GDK_LEAVE_NOTIFY) && gdk_crossing_event_get_detail(event) == GDK_NOTIFY_INFERIOR) {
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
