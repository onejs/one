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

void one_view_set_frame(OneView *view, double x, double y, double width, double height);
void one_view_set_background(OneView *view, const GdkRGBA *color);
void one_view_set_border(OneView *view, double width, const GdkRGBA *color);
void one_view_set_radius(OneView *view, double radius);
void one_view_set_clips(OneView *view, gboolean clips);
// takes its own reference to `layout`; origin is inside the view
void one_view_set_text(OneView *view, PangoLayout *layout, double x, double y);

void one_view_insert_child(OneView *parent, OneView *child, int index);
void one_view_remove_child(OneView *child);

G_END_DECLS
