#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

// The base view every mounted React component paints with: a frame inside its
// parent, an optional background, border and radius, content clipping, and an
// optional text layout. Children keep React's order and each lays out at its
// own frame, as React Native computed it.
#define ONE_TYPE_VIEW (one_view_get_type())
G_DECLARE_FINAL_TYPE(OneView, one_view, ONE, VIEW, GtkWidget)

typedef void (*OneViewSurfaceCallback)(double width, double height, double scale, gpointer data);

OneView *one_view_new(void);

// a flexible view fills whatever its parent gives it and reports every change
// of that size, which is how the window's size reaches React
void one_view_make_surface(OneView *view, OneViewSurfaceCallback callback, gpointer data);
void one_view_refresh_picking(OneView *view);
void one_view_set_flexible(OneView *view, gboolean flexible);
void one_view_set_navigation_handlers(OneView *view, OneView *(*content)(gpointer), void (*allocated)(gpointer), gpointer data);
OneView *one_view_get_navigation_content(OneView *view);

void one_view_set_frame(OneView *view, double x, double y, double width, double height);
void one_view_set_background(OneView *view, const GdkRGBA *color);
void one_view_set_border(OneView *view, double width, const GdkRGBA *color);
void one_view_set_radius(OneView *view, double radius);
// React's resolved transform, 16 floats in the row vector layout graphene
// shares; it applies about the view's center. Null clears it.
void one_view_set_transform(OneView *view, const float *matrix);
// maps a point in the parent's coordinates into the view's own, undoing its
// frame origin and transform; false when the transform cannot be inverted
gboolean one_view_map_from_parent(OneView *view, double x, double y, double *local_x, double *local_y);
void one_view_set_clips(OneView *view, gboolean clips);
// mirrors react's self/descendant hit policy without changing keyboard focus
void one_view_set_pointer_events(OneView *view, gboolean self, gboolean children);
// takes its own reference to `layout`; origin is inside the view
void one_view_set_text(OneView *view, PangoLayout *layout, double x, double y);

typedef enum {
  ONE_IMAGE_COVER,
  ONE_IMAGE_CONTAIN,
  ONE_IMAGE_STRETCH,
  ONE_IMAGE_CENTER,
  ONE_IMAGE_REPEAT,
  ONE_IMAGE_NONE,
} OneImageFit;

// an image painted inside the view's frame under the radius clip; `scale` is
// the asset's pixel density, `tint` recolors it when given, and a null texture
// clears the image. Takes its own reference to `texture`.
void one_view_set_image(OneView *view, GdkTexture *texture, double scale, OneImageFit fit, const GdkRGBA *tint);

// a native control (a GtkSwitch) that fills the view's frame; the view owns it
void one_view_set_control(OneView *view, GtkWidget *control);
GtkWidget *one_view_get_control(OneView *view);

// a scroll view: a GtkScrolledWindow control whose content view holds the React
// children, laid out in content coordinates; the view owns both
void one_view_set_scroll(OneView *view, GtkScrolledWindow *scrolled, OneView *content);
OneView *one_view_get_scroll_content(OneView *view);
void one_view_get_scroll_offset(OneView *view, double *x, double *y);

// the host's own record for this view, which pointer hit testing reads
void one_view_set_owner(OneView *view, gpointer owner);
gpointer one_view_get_owner(OneView *view);
void one_view_get_frame(OneView *view, double *x, double *y, double *width, double *height);
gboolean one_view_get_clips(OneView *view);

void one_view_insert_child(OneView *parent, OneView *child, int index);
void one_view_remove_child(OneView *child);

G_END_DECLS
