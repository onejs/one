#include "OneLinuxControl.h"

#include <algorithm>
#include <cmath>

namespace facebook::react {

bool OneLinuxControl::supports(ComponentHandle handle)
{
  return handle == OneLinuxButtonShadowNode::Handle() || handle == OneLinuxSegmentedControlShadowNode::Handle() ||
      handle == OneLinuxSliderShadowNode::Handle() || handle == OneLinuxDropDownShadowNode::Handle() ||
      handle == OneLinuxProgressBarShadowNode::Handle() || handle == OneLinuxToggleShadowNode::Handle() ||
      handle == OneLinuxStepperShadowNode::Handle() || handle == OneLinuxTextFieldShadowNode::Handle() ||
      handle == OneLinuxSecureFieldShadowNode::Handle();
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
    interactionController_ = gtk_event_controller_legacy_new();
    gtk_event_controller_set_propagation_phase(interactionController_, GTK_PHASE_CAPTURE);
    g_signal_connect(interactionController_, "event", G_CALLBACK(sliderEvent), this);
    gtk_widget_add_controller(widget_, interactionController_);
  } else if (handle == OneLinuxDropDownShadowNode::Handle()) {
    widget_ = gtk_drop_down_new(nullptr, nullptr);
    g_signal_connect(widget_, "notify::selected", G_CALLBACK(selected), this);
  } else if (handle == OneLinuxToggleShadowNode::Handle()) {
    widget_ = gtk_check_button_new();
    g_signal_connect(widget_, "toggled", G_CALLBACK(checked), this);
  } else if (handle == OneLinuxStepperShadowNode::Handle()) {
    widget_ = gtk_spin_button_new_with_range(0, 100, 1);
    gtk_spin_button_set_numeric(GTK_SPIN_BUTTON(widget_), TRUE);
    g_signal_connect(widget_, "value-changed", G_CALLBACK(stepped), this);
  } else if (handle == OneLinuxTextFieldShadowNode::Handle() || handle == OneLinuxSecureFieldShadowNode::Handle()) {
    widget_ = handle == OneLinuxTextFieldShadowNode::Handle() ? gtk_entry_new() : gtk_password_entry_new();
    g_signal_connect(widget_, "changed", G_CALLBACK(edited), this);
    g_signal_connect(widget_, "activate", G_CALLBACK(submitted), this);
  } else {
    widget_ = gtk_progress_bar_new();
  }
  g_object_ref_sink(widget_);
}

OneLinuxControl::~OneLinuxControl()
{
  cancelSliding();
  if (progressTick_) {
    gtk_widget_remove_tick_callback(widget_, progressTick_);
  }
  if (interactionController_) {
    g_signal_handlers_disconnect_by_data(interactionController_, this);
    gtk_widget_remove_controller(widget_, interactionController_);
  }
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
  auto &self = *static_cast<OneLinuxControl *>(data);
  guint index = gtk_drop_down_get_selected(GTK_DROP_DOWN(dropDown));
  std::optional<std::string> selection;
  if (index != GTK_INVALID_LIST_POSITION) {
    selection = self.tagged_ ? self.itemValues_.at(index) : std::to_string(index);
  }
  if (self.emitter_ && self.selection_.record(selection)) {
    auto emitter = std::static_pointer_cast<const OneLinuxControlEventEmitter>(self.emitter_);
    if (self.tagged_) {
      emitter->onSelectionChange(selection.value_or(""), selection.has_value(), self.selection_.eventCount(), self.selection_.revision());
    } else {
      emitter->onControlChange(selection ? static_cast<double>(index) : -1, self.selection_.eventCount(), self.selection_.revision());
    }
  }
}

void OneLinuxControl::checked(GtkCheckButton *button, gpointer data)
{
  static_cast<OneLinuxControl *>(data)->report(gtk_check_button_get_active(button) ? 1 : 0);
}

void OneLinuxControl::stepped(GtkSpinButton *button, gpointer data)
{
  static_cast<OneLinuxControl *>(data)->report(gtk_spin_button_get_value(button));
}

void OneLinuxControl::edited(GtkEditable *editable, gpointer data)
{
  auto &self = *static_cast<OneLinuxControl *>(data);
  std::string text = gtk_editable_get_text(editable);
  if (self.emitter_ && text != self.text_.value() && self.text_.record(text)) {
    std::static_pointer_cast<const OneLinuxControlEventEmitter>(self.emitter_)->onTextChange(text, self.text_.eventCount(), self.text_.revision());
  }
}

void OneLinuxControl::submitted(GtkWidget *, gpointer data)
{
  auto &self = *static_cast<OneLinuxControl *>(data);
  if (self.emitter_) {
    std::static_pointer_cast<const OneLinuxControlEventEmitter>(self.emitter_)->onSubmit(self.text_.revision());
  }
}

void OneLinuxControl::beginSliding()
{
  if (completionSource_) {
    g_source_remove(completionSource_);
    completionSource_ = 0;
    finishSliding();
  }
  if (sliding_) {
    return;
  }
  sliding_ = true;
  slidingRevision_ = value_.revision();
  if (emitter_) {
    std::static_pointer_cast<const OneLinuxControlEventEmitter>(emitter_)->onSliding(true, gtk_range_get_value(GTK_RANGE(widget_)), slidingRevision_);
  }
}

void OneLinuxControl::endSliding()
{
  if (!sliding_ || completionSource_) {
    return;
  }
  // let gtk finish handling the release before reading the final value.
  completionSource_ = g_idle_add_full(G_PRIORITY_DEFAULT, [](gpointer data) -> gboolean {
    auto &self = *static_cast<OneLinuxControl *>(data);
    self.completionSource_ = 0;
    self.finishSliding();
    return G_SOURCE_REMOVE;
  }, this, nullptr);
}

void OneLinuxControl::finishSliding()
{
  if (sliding_ && emitter_ && slidingRevision_ == value_.revision()) {
    std::static_pointer_cast<const OneLinuxControlEventEmitter>(emitter_)->onSliding(false, gtk_range_get_value(GTK_RANGE(widget_)), slidingRevision_);
  }
  sliding_ = false;
}

void OneLinuxControl::cancelSliding()
{
  if (completionSource_) {
    g_source_remove(completionSource_);
    completionSource_ = 0;
  }
  sliding_ = false;
  sliderPointer_ = false;
  sliderKeys_.clear();
}

gboolean OneLinuxControl::sliderEvent(GtkEventControllerLegacy *, GdkEvent *event, gpointer data)
{
  auto &self = *static_cast<OneLinuxControl *>(data);
  switch (gdk_event_get_event_type(event)) {
    case GDK_BUTTON_PRESS:
    case GDK_BUTTON_RELEASE:
      if (gdk_button_event_get_button(event) != GDK_BUTTON_PRIMARY) {
        break;
      }
      if (gdk_event_get_event_type(event) == GDK_BUTTON_PRESS) {
        self.beginSliding();
        self.sliderPointer_ = true;
      } else {
        self.sliderPointer_ = false;
        if (self.sliderKeys_.empty()) self.endSliding();
      }
      break;
    case GDK_TOUCH_BEGIN:
      self.beginSliding();
      self.sliderPointer_ = true;
      break;
    case GDK_TOUCH_END:
    case GDK_TOUCH_CANCEL:
      self.sliderPointer_ = false;
      if (self.sliderKeys_.empty()) self.endSliding();
      break;
    case GDK_KEY_PRESS:
    case GDK_KEY_RELEASE: {
      guint key = gdk_key_event_get_keyval(event);
      if (key != GDK_KEY_Left && key != GDK_KEY_Right && key != GDK_KEY_Up && key != GDK_KEY_Down &&
          key != GDK_KEY_Page_Up && key != GDK_KEY_Page_Down && key != GDK_KEY_Home && key != GDK_KEY_End &&
          key != GDK_KEY_KP_Left && key != GDK_KEY_KP_Right && key != GDK_KEY_KP_Up && key != GDK_KEY_KP_Down &&
          key != GDK_KEY_KP_Page_Up && key != GDK_KEY_KP_Page_Down && key != GDK_KEY_KP_Home && key != GDK_KEY_KP_End) {
        break;
      }
      if (gdk_event_get_event_type(event) == GDK_KEY_PRESS) {
        self.beginSliding();
        self.sliderKeys_.insert(key);
      } else {
        self.sliderKeys_.erase(key);
        if (self.sliderKeys_.empty() && !self.sliderPointer_) self.endSliding();
      }
      break;
    }
    case GDK_SCROLL:
      self.beginSliding();
      self.endSliding();
      break;
    case GDK_FOCUS_CHANGE:
      if (!gdk_focus_event_get_in(event)) {
        self.sliderKeys_.clear();
        if (!self.sliderPointer_) self.endSliding();
      }
      break;
    default:
      break;
  }
  return FALSE;
}

void OneLinuxControl::update(const OneLinuxControlProps &props, EventEmitter::Shared emitter)
{
  emitter_ = std::move(emitter);
  if (handle_ == OneLinuxDropDownShadowNode::Handle()) {
    tagged_ = props.tagged;
    std::optional<std::string> selection;
    if (tagged_ ? props.hasSelection : props.value >= 0) {
      selection = tagged_ ? props.selection : std::to_string(static_cast<int>(props.value));
    }
    selection_.update(selection, props.revision, props.acknowledgedEvent);
    selection_.apply([&](const std::optional<std::string> &value) {
      gtk_widget_set_sensitive(widget_, !props.disabled);
      itemValues_ = props.itemValues;
      if (labels_ != props.labels) {
        labels_ = props.labels;
        GtkStringList *model = gtk_string_list_new(nullptr);
        for (const auto &label : labels_) {
          gtk_string_list_append(model, label.c_str());
        }
        gtk_drop_down_set_model(GTK_DROP_DOWN(widget_), G_LIST_MODEL(model));
        g_object_unref(model);
      }
      guint index = GTK_INVALID_LIST_POSITION;
      if (value) {
        if (tagged_) {
          auto item = std::find(itemValues_.begin(), itemValues_.end(), *value);
          if (item != itemValues_.end()) index = std::distance(itemValues_.begin(), item);
        } else {
          index = std::stoi(*value);
        }
      }
      gtk_drop_down_set_selected(GTK_DROP_DOWN(widget_), index);
    });
    return;
  }
  if (handle_ == OneLinuxTextFieldShadowNode::Handle() || handle_ == OneLinuxSecureFieldShadowNode::Handle()) {
    text_.update(props.text, props.revision, props.acknowledgedEvent);
    text_.apply([&](const std::string &text) {
      gtk_widget_set_sensitive(widget_, !props.disabled);
      g_object_set(widget_, "placeholder-text", props.prompt.c_str(), nullptr);
      gtk_accessible_update_property(GTK_ACCESSIBLE(widget_), GTK_ACCESSIBLE_PROPERTY_LABEL, props.title.c_str(), -1);
      if (text != gtk_editable_get_text(GTK_EDITABLE(widget_))) {
        gtk_editable_set_text(GTK_EDITABLE(widget_), text.c_str());
      }
    });
    return;
  }
  value_.update(props.value, props.revision, props.acknowledgedEvent);
  if (props.disabled || (sliding_ && props.revision != slidingRevision_)) {
    cancelSliding();
  }
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
    } else if (handle_ == OneLinuxToggleShadowNode::Handle()) {
      gtk_check_button_set_label(GTK_CHECK_BUTTON(widget_), props.title.c_str());
      gtk_check_button_set_active(GTK_CHECK_BUTTON(widget_), value != 0);
    } else if (handle_ == OneLinuxStepperShadowNode::Handle()) {
      gtk_spin_button_set_range(GTK_SPIN_BUTTON(widget_), props.minimumValue, props.maximumValue);
      gtk_spin_button_set_increments(GTK_SPIN_BUTTON(widget_), props.step, props.step * 10);
      int digits = 0;
      for (double part : {props.step, props.minimumValue, props.maximumValue}) {
        int precision = 0;
        while (precision < 20 && std::abs(part - std::round(part)) > 1e-9) {
          part *= 10;
          precision++;
        }
        digits = std::max(digits, precision);
      }
      gtk_spin_button_set_digits(GTK_SPIN_BUTTON(widget_), digits);
      gtk_spin_button_set_value(GTK_SPIN_BUTTON(widget_), value);
    } else {
      if (props.indeterminate) {
        if (!progressTick_) {
          lastPulse_ = 0;
          progressTick_ = gtk_widget_add_tick_callback(widget_, [](GtkWidget *widget, GdkFrameClock *clock, gpointer data) -> gboolean {
            auto &self = *static_cast<OneLinuxControl *>(data);
            gint64 now = gdk_frame_clock_get_frame_time(clock);
            if (now - self.lastPulse_ >= 80000) {
              gtk_progress_bar_pulse(GTK_PROGRESS_BAR(widget));
              self.lastPulse_ = now;
            }
            return G_SOURCE_CONTINUE;
          }, this, nullptr);
        }
      } else {
        if (progressTick_) {
          gtk_widget_remove_tick_callback(widget_, progressTick_);
          progressTick_ = 0;
        }
        gtk_progress_bar_set_fraction(GTK_PROGRESS_BAR(widget_), std::clamp(value, 0.0, 1.0));
      }
    }
  });
}

} // namespace facebook::react
