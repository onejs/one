#include "OneLinuxControl.h"

#include <algorithm>

namespace facebook::react {

bool OneLinuxControl::supports(ComponentHandle handle)
{
  return handle == OneLinuxButtonShadowNode::Handle() || handle == OneLinuxSegmentedControlShadowNode::Handle() ||
      handle == OneLinuxSliderShadowNode::Handle() || handle == OneLinuxDropDownShadowNode::Handle() ||
      handle == OneLinuxProgressBarShadowNode::Handle();
}

OneLinuxControl::OneLinuxControl(ComponentHandle handle) : handle_(handle)
{
  if (handle == OneLinuxButtonShadowNode::Handle()) {
    widget_ = gtk_button_new();
    g_signal_connect(widget_, "clicked", G_CALLBACK(clicked), this);
  } else if (handle == OneLinuxSegmentedControlShadowNode::Handle()) {
    widget_ = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 0);
    gtk_widget_add_css_class(widget_, "linked");
  } else if (handle == OneLinuxSliderShadowNode::Handle()) {
    widget_ = gtk_scale_new_with_range(GTK_ORIENTATION_HORIZONTAL, 0, 1, 0.01);
    gtk_scale_set_draw_value(GTK_SCALE(widget_), FALSE);
    g_signal_connect(widget_, "value-changed", G_CALLBACK(slid), this);
  } else if (handle == OneLinuxDropDownShadowNode::Handle()) {
    widget_ = gtk_drop_down_new(nullptr, nullptr);
    g_signal_connect(widget_, "notify::selected", G_CALLBACK(selected), this);
  } else {
    widget_ = gtk_progress_bar_new();
  }
  g_object_ref_sink(widget_);
}

OneLinuxControl::~OneLinuxControl()
{
  g_signal_handlers_disconnect_by_data(widget_, this);
  if (handle_ == OneLinuxSegmentedControlShadowNode::Handle()) {
    for (GtkWidget *child = gtk_widget_get_first_child(widget_); child; child = gtk_widget_get_next_sibling(child)) {
      g_signal_handlers_disconnect_by_data(child, this);
    }
  }
  g_object_unref(widget_);
}

void OneLinuxControl::report(double value)
{
  if (!emitter_ || !value_.record(value)) {
    return;
  }
  std::static_pointer_cast<const OneLinuxControlEventEmitter>(emitter_)->onControlChange(value, value_.eventCount(), value_.revision());
}

void OneLinuxControl::clicked(GtkButton *, gpointer data)
{
  static_cast<OneLinuxControl *>(data)->report(0);
}

void OneLinuxControl::toggled(GtkToggleButton *button, gpointer data)
{
  if (!gtk_toggle_button_get_active(button)) {
    return;
  }
  auto &self = *static_cast<OneLinuxControl *>(data);
  int index = 0;
  for (GtkWidget *child = gtk_widget_get_first_child(self.widget_); child; child = gtk_widget_get_next_sibling(child), index++) {
    if (child == GTK_WIDGET(button)) {
      self.report(index);
      return;
    }
  }
}

void OneLinuxControl::slid(GtkRange *range, gpointer data)
{
  static_cast<OneLinuxControl *>(data)->report(gtk_range_get_value(range));
}

void OneLinuxControl::selected(GObject *dropDown, GParamSpec *, gpointer data)
{
  guint index = gtk_drop_down_get_selected(GTK_DROP_DOWN(dropDown));
  static_cast<OneLinuxControl *>(data)->report(index == GTK_INVALID_LIST_POSITION ? -1 : static_cast<double>(index));
}

void OneLinuxControl::update(const OneLinuxControlProps &props, EventEmitter::Shared emitter)
{
  emitter_ = std::move(emitter);
  value_.update(props.value, props.revision, props.acknowledgedEvent);
  value_.apply([&](double value) {
    gtk_widget_set_sensitive(widget_, !props.disabled);
    if (handle_ == OneLinuxButtonShadowNode::Handle()) {
      gtk_button_set_label(GTK_BUTTON(widget_), props.title.c_str());
    } else if (handle_ == OneLinuxSegmentedControlShadowNode::Handle()) {
      if (labels_ != props.labels) {
        while (GtkWidget *child = gtk_widget_get_first_child(widget_)) {
          g_signal_handlers_disconnect_by_data(child, this);
          gtk_box_remove(GTK_BOX(widget_), child);
        }
        labels_ = props.labels;
        GtkToggleButton *group = nullptr;
        for (const auto &label : labels_) {
          GtkWidget *button = gtk_toggle_button_new_with_label(label.c_str());
          gtk_toggle_button_set_group(GTK_TOGGLE_BUTTON(button), group);
          group = GTK_TOGGLE_BUTTON(button);
          gtk_widget_set_hexpand(button, TRUE);
          gtk_box_append(GTK_BOX(widget_), button);
          g_signal_connect(button, "toggled", G_CALLBACK(toggled), this);
        }
      }
      int index = 0;
      for (GtkWidget *child = gtk_widget_get_first_child(widget_); child; child = gtk_widget_get_next_sibling(child), index++) {
        gtk_toggle_button_set_active(GTK_TOGGLE_BUTTON(child), value == index);
      }
    } else if (handle_ == OneLinuxSliderShadowNode::Handle()) {
      gtk_range_set_range(GTK_RANGE(widget_), props.minimumValue, props.maximumValue);
      gtk_range_set_increments(GTK_RANGE(widget_), props.step, props.step * 10);
      gtk_range_set_value(GTK_RANGE(widget_), value);
    } else if (handle_ == OneLinuxDropDownShadowNode::Handle()) {
      if (labels_ != props.labels) {
        labels_ = props.labels;
        GtkStringList *model = gtk_string_list_new(nullptr);
        for (const auto &label : labels_) {
          gtk_string_list_append(model, label.c_str());
        }
        gtk_drop_down_set_model(GTK_DROP_DOWN(widget_), G_LIST_MODEL(model));
        g_object_unref(model);
      }
      gtk_drop_down_set_selected(GTK_DROP_DOWN(widget_), value < 0 ? GTK_INVALID_LIST_POSITION : static_cast<guint>(value));
    } else {
      gtk_progress_bar_set_fraction(GTK_PROGRESS_BAR(widget_), std::clamp(value, 0.0, 1.0));
    }
  });
}

} // namespace facebook::react
