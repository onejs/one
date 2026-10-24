#include "OneLinuxView.h"

#include <algorithm>
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

  gboolean has_transform;
  graphene_matrix_t transform;

  GdkTexture *image;
  double image_scale;
  OneImageFit image_fit;
  gboolean has_tint;
  GdkRGBA tint;

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

// a single line field centers its line vertically like a UITextField does; a
// GtkText given no baseline sits its line at the baseline of its smallest
// size instead, so give it the baseline of its natural size centered in the box
static int control_baseline(GtkWidget *control, int width, int height)
{
  GtkWidget *field = GTK_IS_STACK(control) ? gtk_stack_get_visible_child(GTK_STACK(control)) : control;
  if (!GTK_IS_TEXT(field)) {
    return -1;
  }
  int minimum, natural, minimumBaseline, naturalBaseline;
  gtk_widget_measure(control, GTK_ORIENTATION_VERTICAL, width, &minimum, &natural, &minimumBaseline, &naturalBaseline);
  return naturalBaseline < 0 ? -1 : (height - natural) / 2 + naturalBaseline;
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
      gtk_widget_allocate(child, width, height, control_baseline(child, width, height), nullptr);
      continue;
    }
    OneView *childView = ONE_VIEW(child);
    graphene_point_t origin = GRAPHENE_POINT_INIT(static_cast<float>(childView->x), static_cast<float>(childView->y));
    GskTransform *transform = gsk_transform_translate(nullptr, &origin);
    if (childView->has_transform) {
      graphene_point_t center = GRAPHENE_POINT_INIT(static_cast<float>(childView->width / 2), static_cast<float>(childView->height / 2));
      graphene_point_t back = GRAPHENE_POINT_INIT(-center.x, -center.y);
      transform = gsk_transform_translate(transform, &center);
      transform = gsk_transform_matrix(transform, &childView->transform);
      transform = gsk_transform_translate(transform, &back);
    }
    gtk_widget_allocate(
        child,
        static_cast<int>(std::ceil(childView->width)),
        static_cast<int>(std::ceil(childView->height)),
        -1,
        transform);
  }
}

// where the image goes inside the view for each resize mode; a tile for repeat
static graphene_rect_t image_target(OneView *view, double width, double height)
{
  double naturalWidth = gdk_texture_get_width(view->image) / view->image_scale;
  double naturalHeight = gdk_texture_get_height(view->image) / view->image_scale;
  double factor = 1;
  switch (view->image_fit) {
    case ONE_IMAGE_COVER:
      factor = std::max(width / naturalWidth, height / naturalHeight);
      break;
    case ONE_IMAGE_CONTAIN:
      factor = std::min(width / naturalWidth, height / naturalHeight);
      break;
    case ONE_IMAGE_STRETCH:
      return GRAPHENE_RECT_INIT(0, 0, static_cast<float>(width), static_cast<float>(height));
    case ONE_IMAGE_CENTER:
    case ONE_IMAGE_REPEAT:
    case ONE_IMAGE_NONE:
      break;
  }
  double targetWidth = naturalWidth * factor;
  double targetHeight = naturalHeight * factor;
  bool centered = view->image_fit != ONE_IMAGE_NONE && view->image_fit != ONE_IMAGE_REPEAT;
  return GRAPHENE_RECT_INIT(
      centered ? static_cast<float>((width - targetWidth) / 2) : 0,
      centered ? static_cast<float>((height - targetHeight) / 2) : 0,
      static_cast<float>(targetWidth),
      static_cast<float>(targetHeight));
}

static void snapshot_image(OneView *view, GtkSnapshot *snapshot, const GskRoundedRect *outline)
{
  graphene_rect_t bounds = GRAPHENE_RECT_INIT(0, 0, static_cast<float>(view->width), static_cast<float>(view->height));
  graphene_rect_t target = image_target(view, view->width, view->height);
  if (target.size.width <= 0 || target.size.height <= 0 || bounds.size.width <= 0 || bounds.size.height <= 0) {
    return;
  }
  gtk_snapshot_push_rounded_clip(snapshot, outline);
  if (view->has_tint) {
    gtk_snapshot_push_mask(snapshot, GSK_MASK_MODE_ALPHA);
  }
  if (view->image_fit == ONE_IMAGE_REPEAT) {
    gtk_snapshot_push_repeat(snapshot, &bounds, &target);
    gtk_snapshot_append_scaled_texture(snapshot, view->image, GSK_SCALING_FILTER_TRILINEAR, &target);
    gtk_snapshot_pop(snapshot);
  } else {
    gtk_snapshot_append_scaled_texture(snapshot, view->image, GSK_SCALING_FILTER_TRILINEAR, &target);
  }
  if (view->has_tint) {
    gtk_snapshot_pop(snapshot);
    gtk_snapshot_append_color(snapshot, &view->tint, &bounds);
    gtk_snapshot_pop(snapshot);
  }
  gtk_snapshot_pop(snapshot);
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
  if (view->image) {
    snapshot_image(view, snapshot, &outline);
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
  g_clear_object(&view->image);
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

void one_view_set_transform(OneView *view, const float *matrix)
{
  gboolean changed = view->has_transform != (matrix != nullptr);
  if (matrix) {
    graphene_matrix_t next;
    graphene_matrix_init_from_float(&next, matrix);
    changed = changed || !graphene_matrix_equal(&view->transform, &next);
    view->transform = next;
  }
  view->has_transform = matrix != nullptr;
  if (changed) {
    if (GtkWidget *parent = gtk_widget_get_parent(GTK_WIDGET(view))) {
      gtk_widget_queue_allocate(parent);
    }
  }
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

void one_view_set_image(OneView *view, GdkTexture *texture, double scale, OneImageFit fit, const GdkRGBA *tint)
{
  g_set_object(&view->image, texture);
  view->image_scale = scale > 0 ? scale : 1;
  view->image_fit = fit;
  view->has_tint = tint != nullptr;
  if (tint) {
    view->tint = *tint;
  }
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
