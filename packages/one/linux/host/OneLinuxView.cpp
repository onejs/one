#include "OneLinuxView.h"

#include <cmath>

struct _OneView {
  GtkWidget parent_instance;

  double x, y, width, height;
  gboolean has_background;
  GdkRGBA background;
  gboolean has_border;
  double border_width;
  GdkRGBA border_color;
  double radius;
  gboolean clips;

  PangoLayout *layout;
  double text_x, text_y;

  // a native GTK control that fills the view
  GtkWidget *control;
  gpointer owner;
  OneView *scroll_content;

  gboolean surface;
  OneViewSurfaceCallback surface_callback;
  gpointer surface_data;
  double reported_width, reported_height, reported_scale;
};

G_DEFINE_TYPE(OneView, one_view, GTK_TYPE_WIDGET)

static void one_view_measure(
    GtkWidget *widget, GtkOrientation orientation, int, int *minimum, int *natural, int *minBaseline, int *natBaseline)
{
  OneView *view = ONE_VIEW(widget);
  int size = view->surface ? 0 : static_cast<int>(std::ceil(orientation == GTK_ORIENTATION_HORIZONTAL ? view->width : view->height));
  *minimum = size;
  *natural = size;
  *minBaseline = -1;
  *natBaseline = -1;
}

static void one_view_size_allocate(GtkWidget *widget, int width, int height, int)
{
  OneView *view = ONE_VIEW(widget);

  if (view->surface) {
    GtkNative *native = gtk_widget_get_native(widget);
    GdkSurface *surface = native ? gtk_native_get_surface(native) : nullptr;
    double scale = surface ? gdk_surface_get_scale(surface) : 1;
    if (view->reported_width != width || view->reported_height != height || view->reported_scale != scale) {
      view->reported_width = width;
      view->reported_height = height;
      view->reported_scale = scale;
      view->surface_callback(width, height, scale, view->surface_data);
    }
  }

  for (GtkWidget *child = gtk_widget_get_first_child(widget); child; child = gtk_widget_get_next_sibling(child)) {
    if (child == view->control) {
      gtk_widget_allocate(child, width, height, -1, nullptr);
      continue;
    }
    OneView *childView = ONE_VIEW(child);
    graphene_point_t origin = GRAPHENE_POINT_INIT(static_cast<float>(childView->x), static_cast<float>(childView->y));
    GskTransform *transform = gsk_transform_translate(nullptr, &origin);
    gtk_widget_allocate(
        child,
        static_cast<int>(std::ceil(childView->width)),
        static_cast<int>(std::ceil(childView->height)),
        -1,
        transform);
  }
}

static void one_view_snapshot(GtkWidget *widget, GtkSnapshot *snapshot)
{
  OneView *view = ONE_VIEW(widget);
  graphene_rect_t bounds = GRAPHENE_RECT_INIT(0, 0, static_cast<float>(view->width), static_cast<float>(view->height));
  GskRoundedRect outline;
  gsk_rounded_rect_init_from_rect(&outline, &bounds, static_cast<float>(view->radius));

  if (view->surface) {
    bounds = GRAPHENE_RECT_INIT(0, 0, static_cast<float>(gtk_widget_get_width(widget)), static_cast<float>(gtk_widget_get_height(widget)));
  }

  if (view->has_background) {
    if (view->radius > 0) {
      gtk_snapshot_push_rounded_clip(snapshot, &outline);
      gtk_snapshot_append_color(snapshot, &view->background, &bounds);
      gtk_snapshot_pop(snapshot);
    } else {
      gtk_snapshot_append_color(snapshot, &view->background, &bounds);
    }
  }
  if (view->has_border && view->border_width > 0) {
    float widths[4] = {
        static_cast<float>(view->border_width),
        static_cast<float>(view->border_width),
        static_cast<float>(view->border_width),
        static_cast<float>(view->border_width)};
    GdkRGBA colors[4] = {view->border_color, view->border_color, view->border_color, view->border_color};
    gtk_snapshot_append_border(snapshot, &outline, widths, colors);
  }
  if (view->layout) {
    GdkRGBA black = {0, 0, 0, 1};
    gtk_snapshot_save(snapshot);
    graphene_point_t origin = GRAPHENE_POINT_INIT(static_cast<float>(view->text_x), static_cast<float>(view->text_y));
    gtk_snapshot_translate(snapshot, &origin);
    gtk_snapshot_append_layout(snapshot, view->layout, &black);
    gtk_snapshot_restore(snapshot);
  }

  if (view->clips) {
    gtk_snapshot_push_rounded_clip(snapshot, &outline);
  }
  for (GtkWidget *child = gtk_widget_get_first_child(widget); child; child = gtk_widget_get_next_sibling(child)) {
    gtk_widget_snapshot_child(widget, child, snapshot);
  }
  if (view->clips) {
    gtk_snapshot_pop(snapshot);
  }
}

// a view only takes pointer hits over its children, so a view that spans its
// siblings never shadows them and a control inside it still gets its clicks
static gboolean one_view_contains(GtkWidget *widget, double x, double y)
{
  for (GtkWidget *child = gtk_widget_get_first_child(widget); child; child = gtk_widget_get_next_sibling(child)) {
    graphene_rect_t bounds;
    graphene_point_t point = {static_cast<float>(x), static_cast<float>(y)};
    if (gtk_widget_compute_bounds(child, widget, &bounds) && graphene_rect_contains_point(&bounds, &point)) {
      return TRUE;
    }
  }
  return FALSE;
}

static void one_view_dispose(GObject *object)
{
  OneView *view = ONE_VIEW(object);
  while (GtkWidget *child = gtk_widget_get_first_child(GTK_WIDGET(view))) {
    gtk_widget_unparent(child);
  }
  g_clear_object(&view->layout);
  G_OBJECT_CLASS(one_view_parent_class)->dispose(object);
}

static void one_view_class_init(OneViewClass *klass)
{
  GtkWidgetClass *widgetClass = GTK_WIDGET_CLASS(klass);
  widgetClass->measure = one_view_measure;
  widgetClass->size_allocate = one_view_size_allocate;
  widgetClass->snapshot = one_view_snapshot;
  widgetClass->contains = one_view_contains;
  G_OBJECT_CLASS(klass)->dispose = one_view_dispose;
}

static void one_view_init(OneView *view)
{
  // a view is never the focus itself, but a field inside it must still be able to take it
  gtk_widget_set_focusable(GTK_WIDGET(view), FALSE);
}

OneView *one_view_new(void)
{
  return ONE_VIEW(g_object_new(ONE_TYPE_VIEW, nullptr));
}

void one_view_make_surface(OneView *view, OneViewSurfaceCallback callback, gpointer data)
{
  view->surface = TRUE;
  view->surface_callback = callback;
  view->surface_data = data;
  gtk_widget_set_hexpand(GTK_WIDGET(view), TRUE);
  gtk_widget_set_vexpand(GTK_WIDGET(view), TRUE);
}

void one_view_set_frame(OneView *view, double x, double y, double width, double height)
{
  if (view->x == x && view->y == y && view->width == width && view->height == height) {
    return;
  }
  view->x = x;
  view->y = y;
  view->width = width;
  view->height = height;
  gtk_widget_queue_resize(GTK_WIDGET(view));
}

void one_view_set_background(OneView *view, const GdkRGBA *color)
{
  view->has_background = color != nullptr;
  if (color) {
    view->background = *color;
  }
  gtk_widget_queue_draw(GTK_WIDGET(view));
}

void one_view_set_border(OneView *view, double width, const GdkRGBA *color)
{
  view->has_border = color != nullptr;
  view->border_width = width;
  if (color) {
    view->border_color = *color;
  }
  gtk_widget_queue_draw(GTK_WIDGET(view));
}

void one_view_set_radius(OneView *view, double radius)
{
  view->radius = radius;
  gtk_widget_queue_draw(GTK_WIDGET(view));
}

void one_view_set_clips(OneView *view, gboolean clips)
{
  view->clips = clips;
  gtk_widget_queue_draw(GTK_WIDGET(view));
}

void one_view_set_text(OneView *view, PangoLayout *layout, double x, double y)
{
  g_set_object(&view->layout, layout);
  view->text_x = x;
  view->text_y = y;
  gtk_widget_queue_draw(GTK_WIDGET(view));
}

void one_view_set_control(OneView *view, GtkWidget *control)
{
  view->control = control;
  gtk_widget_set_parent(control, GTK_WIDGET(view));
}

GtkWidget *one_view_get_control(OneView *view)
{
  return view->control;
}

void one_view_set_scroll(OneView *view, GtkScrolledWindow *scrolled, OneView *content)
{
  one_view_set_control(view, GTK_WIDGET(scrolled));
  view->scroll_content = content;
  gtk_scrolled_window_set_child(scrolled, GTK_WIDGET(content));
}

OneView *one_view_get_scroll_content(OneView *view)
{
  return view->scroll_content;
}

void one_view_get_scroll_offset(OneView *view, double *x, double *y)
{
  GtkScrolledWindow *scrolled = GTK_SCROLLED_WINDOW(view->control);
  *x = gtk_adjustment_get_value(gtk_scrolled_window_get_hadjustment(scrolled));
  *y = gtk_adjustment_get_value(gtk_scrolled_window_get_vadjustment(scrolled));
}

void one_view_set_owner(OneView *view, gpointer owner)
{
  view->owner = owner;
}

gpointer one_view_get_owner(OneView *view)
{
  return view->owner;
}

void one_view_get_frame(OneView *view, double *x, double *y, double *width, double *height)
{
  *x = view->x;
  *y = view->y;
  *width = view->width;
  *height = view->height;
}

gboolean one_view_get_clips(OneView *view)
{
  return view->clips;
}

void one_view_insert_child(OneView *parent, OneView *child, int index)
{
  GtkWidget *previous = nullptr;
  GtkWidget *sibling = gtk_widget_get_first_child(GTK_WIDGET(parent));
  for (int i = 0; i < index && sibling; i++) {
    previous = sibling;
    sibling = gtk_widget_get_next_sibling(sibling);
  }
  gtk_widget_insert_after(GTK_WIDGET(child), GTK_WIDGET(parent), previous);
}

void one_view_remove_child(OneView *child)
{
  gtk_widget_unparent(GTK_WIDGET(child));
}
