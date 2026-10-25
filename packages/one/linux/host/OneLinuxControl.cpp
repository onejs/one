#include "OneLinuxControl.h"
#include "OneLinuxControlledValue.h"

#include <algorithm>
#include <array>
#include <cassert>
#include <cmath>
#include <optional>
#include <set>

namespace facebook::react {

struct ControlUpdate {
  const OneLinuxControlProps &props;
  const OneLinuxControlProps *previous;

  template <typename T> bool changed(T member) const {
    return !previous || previous->*member != props.*member;
  }
};

class OneLinuxControlImpl {
 public:
  explicit OneLinuxControlImpl(GtkWidget *widget) : widget_(widget) { g_object_ref_sink(widget_); }
  virtual ~OneLinuxControlImpl() {
    g_signal_handlers_disconnect_by_data(widget_, this);
    g_object_unref(widget_);
  }
  virtual void prepare(const ControlUpdate &) {}
  virtual void apply(const ControlUpdate &) = 0;
  // whether this update can change the natural size gtk reports
  virtual bool affectsSize(const ControlUpdate &update) const {
    return update.changed(&OneLinuxControlProps::title) || update.changed(&OneLinuxControlProps::labels) ||
        update.changed(&OneLinuxControlProps::minimumValue) || update.changed(&OneLinuxControlProps::maximumValue) ||
        update.changed(&OneLinuxControlProps::step);
  }
  GtkWidget *widget_;
  EventEmitter::Shared emitter_;
  std::shared_ptr<const OneLinuxControlProps> props_;
};

struct NumericControl : OneLinuxControlImpl {
  using OneLinuxControlImpl::OneLinuxControlImpl;
  OneLinuxControlledValue<double> value_;

  void apply(const ControlUpdate &update) final {
    const auto &props = update.props;
    value_.update(props.value, props.revision, props.acknowledgedEvent);
    value_.apply([&](double value) { applyValue(update, value); });
  }
  virtual void applyValue(const ControlUpdate &, double) = 0;
  void report(double value) {
    if (emitter_ && value_.record(value)) {
      std::static_pointer_cast<const OneLinuxControlEventEmitter>(emitter_)->onControlChange(value, value_.eventCount(), value_.revision());
    }
  }
};

struct SwitchControl final : NumericControl {
  SwitchControl() : NumericControl(gtk_switch_new()) {
    g_signal_connect(widget_, "notify::active", G_CALLBACK(changed), this);
  }
  static void changed(GObject *widget, GParamSpec *, gpointer data) {
    static_cast<SwitchControl *>(data)->report(gtk_switch_get_active(GTK_SWITCH(widget)) ? 1 : 0);
  }
  void applyValue(const ControlUpdate &, double value) override {
    gtk_switch_set_active(GTK_SWITCH(widget_), value != 0);
  }
};

struct ButtonControl final : NumericControl {
  ButtonControl() : NumericControl(gtk_button_new()) {
    g_signal_connect(widget_, "clicked", G_CALLBACK(clicked), this);
  }
  static void clicked(GtkButton *, gpointer data) { static_cast<ButtonControl *>(data)->report(0); }
  void applyValue(const ControlUpdate &update, double) override {
    if (update.changed(&OneLinuxControlProps::title)) gtk_button_set_label(GTK_BUTTON(widget_), update.props.title.c_str());
  }
};

struct SegmentedControl final : NumericControl {
  std::vector<std::string> labels_;
  SegmentedControl() : NumericControl(gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 0)) {
    gtk_widget_add_css_class(widget_, "linked");
  }
  ~SegmentedControl() override { disconnectChildren(); }
  void disconnectChildren() {
    for (GtkWidget *child = gtk_widget_get_first_child(widget_); child; child = gtk_widget_get_next_sibling(child)) {
      g_signal_handlers_disconnect_by_data(child, this);
    }
  }
  static void toggled(GtkToggleButton *button, gpointer data) {
    if (!gtk_toggle_button_get_active(button)) return;
    auto &self = *static_cast<SegmentedControl *>(data);
    int index = 0;
    for (GtkWidget *child = gtk_widget_get_first_child(self.widget_); child; child = gtk_widget_get_next_sibling(child), index++) {
      if (child == GTK_WIDGET(button)) { self.report(index); return; }
    }
  }
  void applyValue(const ControlUpdate &update, double value) override {
    const auto &props = update.props;
    if (labels_ != props.labels) {
      disconnectChildren();
      while (GtkWidget *child = gtk_widget_get_first_child(widget_)) gtk_box_remove(GTK_BOX(widget_), child);
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
  }
};

struct SliderControl final : NumericControl {
  GtkEventController *interactionController_;
  std::set<guint> sliderKeys_;
  bool sliderPointer_{false};
  bool sliding_{false};
  int slidingRevision_{0};
  guint completionSource_{0};

  SliderControl() : NumericControl(gtk_scale_new_with_range(GTK_ORIENTATION_HORIZONTAL, 0, 1, 0.01)),
      interactionController_(gtk_event_controller_legacy_new()) {
    gtk_scale_set_draw_value(GTK_SCALE(widget_), FALSE);
    g_signal_connect(widget_, "value-changed", G_CALLBACK(slid), this);
    gtk_event_controller_set_propagation_phase(interactionController_, GTK_PHASE_CAPTURE);
    g_signal_connect(interactionController_, "event", G_CALLBACK(sliderEvent), this);
    gtk_widget_add_controller(widget_, interactionController_);
  }
  ~SliderControl() override {
    cancelSliding();
    g_signal_handlers_disconnect_by_data(interactionController_, this);
    gtk_widget_remove_controller(widget_, interactionController_);
  }
  void prepare(const ControlUpdate &update) override {
    const auto &props = update.props;
    if (props.disabled || (sliding_ && props.revision != slidingRevision_)) cancelSliding(true, !props.disabled);
  }
  void applyValue(const ControlUpdate &update, double value) override {
    const auto &props = update.props;
    if (update.changed(&OneLinuxControlProps::minimumValue) || update.changed(&OneLinuxControlProps::maximumValue)) gtk_range_set_range(GTK_RANGE(widget_), props.minimumValue, props.maximumValue);
    if (update.changed(&OneLinuxControlProps::step)) gtk_range_set_increments(GTK_RANGE(widget_), props.step, props.step * 10);
    if (gtk_range_get_value(GTK_RANGE(widget_)) != value) gtk_range_set_value(GTK_RANGE(widget_), value);
  }
  static void slid(GtkRange *range, gpointer data)
  {
    auto &self = *static_cast<SliderControl *>(data);
    if (!self.value_.applying() && (self.sliderPointer_ || !self.sliderKeys_.empty())) self.beginSliding();
    self.report(gtk_range_get_value(range));
  }

  void beginSliding()
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

  void endSliding()
  {
    if (!sliding_ || completionSource_) {
      return;
    }
    // let gtk finish handling the release before reading the final value.
    completionSource_ = g_idle_add_full(G_PRIORITY_DEFAULT, [](gpointer data) -> gboolean {
      auto &self = *static_cast<SliderControl *>(data);
      self.completionSource_ = 0;
      self.finishSliding();
      return G_SOURCE_REMOVE;
    }, this, nullptr);
  }

  void finishSliding()
  {
    if (sliding_ && emitter_ && slidingRevision_ == value_.revision()) {
      std::static_pointer_cast<const OneLinuxControlEventEmitter>(emitter_)->onSliding(false, gtk_range_get_value(GTK_RANGE(widget_)), slidingRevision_);
    }
    sliding_ = false;
  }

  void cancelSliding(bool notify = false, bool preserveInput = false)
  {
    if (completionSource_) {
      g_source_remove(completionSource_);
      completionSource_ = 0;
    }
    if (notify) finishSliding();
    else sliding_ = false;
    if (!preserveInput) {
      sliderPointer_ = false;
      sliderKeys_.clear();
    }
  }

  static gboolean sliderEvent(GtkEventControllerLegacy *, GdkEvent *event, gpointer data)
  {
    auto &self = *static_cast<SliderControl *>(data);
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
      case GDK_MOTION_NOTIFY:
      case GDK_TOUCH_UPDATE:
        if (self.sliderPointer_ && gtk_widget_is_sensitive(self.widget_)) self.beginSliding();
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

};

struct DropDownControl final : OneLinuxControlImpl {
  std::vector<std::string> labels_;
  std::vector<std::string> itemValues_;
  bool tagged_{false};
  OneLinuxControlledValue<std::optional<std::string>> selection_;
  DropDownControl() : OneLinuxControlImpl(gtk_drop_down_new(nullptr, nullptr)) {
    g_signal_connect(widget_, "notify::selected", G_CALLBACK(selected), this);
  }
  static void selected(GObject *dropDown, GParamSpec *, gpointer data)
  {
    auto &self = *static_cast<DropDownControl *>(data);
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

  // the button shows the selected item, so its width follows the selection
  bool affectsSize(const ControlUpdate &update) const override {
    return OneLinuxControlImpl::affectsSize(update) || update.changed(&OneLinuxControlProps::value) ||
        update.changed(&OneLinuxControlProps::selection) || update.changed(&OneLinuxControlProps::hasSelection) ||
        update.changed(&OneLinuxControlProps::itemValues) || update.changed(&OneLinuxControlProps::tagged) ||
        update.changed(&OneLinuxControlProps::revision);
  }

  void apply(const ControlUpdate &update) override {
    const auto &props = update.props;
    tagged_ = props.tagged;
    std::optional<std::string> selection;
    if (tagged_ ? props.hasSelection : props.value >= 0) {
      selection = tagged_ ? props.selection : std::to_string(static_cast<int>(props.value));
    }
    selection_.update(selection, props.revision, props.acknowledgedEvent);
    selection_.apply([&](const std::optional<std::string> &value) {
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
      if (gtk_drop_down_get_selected(GTK_DROP_DOWN(widget_)) != index) gtk_drop_down_set_selected(GTK_DROP_DOWN(widget_), index);
    });
  }
};

struct ToggleControl final : NumericControl {
  ToggleControl() : NumericControl(gtk_check_button_new()) {
    g_signal_connect(widget_, "toggled", G_CALLBACK(checked), this);
  }
  static void checked(GtkCheckButton *button, gpointer data) {
    static_cast<ToggleControl *>(data)->report(gtk_check_button_get_active(button) ? 1 : 0);
  }
  void applyValue(const ControlUpdate &update, double value) override {
    if (update.changed(&OneLinuxControlProps::title)) gtk_check_button_set_label(GTK_CHECK_BUTTON(widget_), update.props.title.c_str());
    gtk_check_button_set_active(GTK_CHECK_BUTTON(widget_), value != 0);
  }
};

struct StepperControl final : NumericControl {
  GtkSpinButton *stepper_;
  GtkWidget *stepperLabel_;
  StepperControl() : NumericControl(gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 8)),
      stepper_(GTK_SPIN_BUTTON(gtk_spin_button_new_with_range(0, 100, 1))), stepperLabel_(gtk_label_new("")) {
    gtk_box_append(GTK_BOX(widget_), stepperLabel_);
    gtk_spin_button_set_numeric(stepper_, TRUE);
    gtk_box_append(GTK_BOX(widget_), GTK_WIDGET(stepper_));
    g_signal_connect(stepper_, "value-changed", G_CALLBACK(stepped), this);
  }
  ~StepperControl() override { g_signal_handlers_disconnect_by_data(stepper_, this); }
  static void stepped(GtkSpinButton *button, gpointer data) {
    static_cast<StepperControl *>(data)->report(gtk_spin_button_get_value(button));
  }
  void applyValue(const ControlUpdate &update, double value) override {
    const auto &props = update.props;
    if (update.changed(&OneLinuxControlProps::title)) {
      gtk_label_set_text(GTK_LABEL(stepperLabel_), props.title.c_str());
      gtk_widget_set_visible(stepperLabel_, !props.title.empty());
      gtk_accessible_update_property(GTK_ACCESSIBLE(stepper_), GTK_ACCESSIBLE_PROPERTY_LABEL, props.title.c_str(), -1);
    }
    if (update.changed(&OneLinuxControlProps::minimumValue) || update.changed(&OneLinuxControlProps::maximumValue)) gtk_spin_button_set_range(stepper_, props.minimumValue, props.maximumValue);
    if (update.changed(&OneLinuxControlProps::step)) gtk_spin_button_set_increments(stepper_, props.step, props.step * 10);
    int digits = 0;
    for (double part : {props.step, props.minimumValue, props.maximumValue}) {
      int precision = 0;
      while (precision < 20 && std::abs(part - std::round(part)) > 1e-9) {
        part *= 10;
        precision++;
      }
      digits = std::max(digits, precision);
    }
    if (gtk_spin_button_get_digits(stepper_) != digits) gtk_spin_button_set_digits(stepper_, digits);
    if (gtk_spin_button_get_value(stepper_) != value || update.changed(&OneLinuxControlProps::revision)) gtk_spin_button_set_value(stepper_, value);
  }
};

struct TextFieldControl final : OneLinuxControlImpl {
  OneLinuxControlledValue<std::string> text_;
  explicit TextFieldControl(bool secure) : OneLinuxControlImpl(secure ? gtk_password_entry_new() : gtk_entry_new()) {
    g_signal_connect(widget_, "changed", G_CALLBACK(edited), this);
    g_signal_connect(widget_, "activate", G_CALLBACK(submitted), this);
  }
  static void edited(GtkEditable *editable, gpointer data)
  {
    auto &self = *static_cast<TextFieldControl *>(data);
    std::string text = gtk_editable_get_text(editable);
    if (self.emitter_ && text != self.text_.value() && self.text_.record(text)) {
      std::static_pointer_cast<const OneLinuxControlEventEmitter>(self.emitter_)->onTextChange(text, self.text_.eventCount(), self.text_.revision());
    }
  }

  static void submitted(GtkWidget *, gpointer data)
  {
    auto &self = *static_cast<TextFieldControl *>(data);
    if (self.emitter_) {
      std::static_pointer_cast<const OneLinuxControlEventEmitter>(self.emitter_)->onSubmit(self.text_.revision());
    }
  }

  // gtk's text widget includes its placeholder in its natural width
  bool affectsSize(const ControlUpdate &update) const override {
    return OneLinuxControlImpl::affectsSize(update) || update.changed(&OneLinuxControlProps::prompt);
  }

  void apply(const ControlUpdate &update) override {
    const auto &props = update.props;
    text_.update(props.text, props.revision, props.acknowledgedEvent);
    text_.apply([&](const std::string &text) {
      if (update.changed(&OneLinuxControlProps::prompt)) g_object_set(widget_, "placeholder-text", props.prompt.c_str(), nullptr);
      if (update.changed(&OneLinuxControlProps::title)) gtk_accessible_update_property(GTK_ACCESSIBLE(widget_), GTK_ACCESSIBLE_PROPERTY_LABEL, props.title.c_str(), -1);
      if (text != gtk_editable_get_text(GTK_EDITABLE(widget_))) {
        gtk_editable_set_text(GTK_EDITABLE(widget_), text.c_str());
      }
    });
  }
};

struct ProgressControl final : OneLinuxControlImpl {
  guint progressTick_{0};
  gint64 lastPulse_{0};
  ProgressControl() : OneLinuxControlImpl(gtk_progress_bar_new()) {}
  ~ProgressControl() override { if (progressTick_) gtk_widget_remove_tick_callback(widget_, progressTick_); }
  void apply(const ControlUpdate &update) override {
    const auto &props = update.props;
    if (props.indeterminate) {
      if (!progressTick_) {
        lastPulse_ = 0;
        progressTick_ = gtk_widget_add_tick_callback(widget_, [](GtkWidget *widget, GdkFrameClock *clock, gpointer data) -> gboolean {
          auto &self = *static_cast<ProgressControl *>(data);
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
      gtk_progress_bar_set_fraction(GTK_PROGRESS_BAR(widget_), std::clamp(props.value, 0.0, 1.0));
    }
  }
};

struct ControlFactory {
  ComponentHandle handle;
  std::unique_ptr<OneLinuxControlImpl> (*create)();
};

template <typename Control> std::unique_ptr<OneLinuxControlImpl> createControl() { return std::make_unique<Control>(); }

static const std::array<ControlFactory, 10> factories{{
  {OneLinuxSwitchShadowNode::Handle(), createControl<SwitchControl>},
  {OneLinuxButtonShadowNode::Handle(), createControl<ButtonControl>},
  {OneLinuxSegmentedControlShadowNode::Handle(), createControl<SegmentedControl>},
  {OneLinuxSliderShadowNode::Handle(), createControl<SliderControl>},
  {OneLinuxDropDownShadowNode::Handle(), createControl<DropDownControl>},
  {OneLinuxToggleShadowNode::Handle(), createControl<ToggleControl>},
  {OneLinuxStepperShadowNode::Handle(), createControl<StepperControl>},
  {OneLinuxTextFieldShadowNode::Handle(), []() -> std::unique_ptr<OneLinuxControlImpl> { return std::make_unique<TextFieldControl>(false); }},
  {OneLinuxSecureFieldShadowNode::Handle(), []() -> std::unique_ptr<OneLinuxControlImpl> { return std::make_unique<TextFieldControl>(true); }},
  {OneLinuxProgressBarShadowNode::Handle(), createControl<ProgressControl>},
}};

bool OneLinuxControl::supports(ComponentHandle handle)
{
  return std::any_of(factories.begin(), factories.end(), [&](const auto &factory) { return factory.handle == handle; });
}

OneLinuxControl::OneLinuxControl(ComponentHandle handle)
{
  auto factory = std::find_if(factories.begin(), factories.end(), [&](const auto &entry) { return entry.handle == handle; });
  assert(factory != factories.end());
  control_ = factory->create();
}

OneLinuxControl::~OneLinuxControl() = default;
GtkWidget *OneLinuxControl::widget() const { return control_->widget_; }

bool OneLinuxControl::update(std::shared_ptr<const OneLinuxControlProps> next, EventEmitter::Shared emitter)
{
  auto previous = std::move(control_->props_);
  control_->props_ = std::move(next);
  control_->emitter_ = std::move(emitter);
  ControlUpdate update{*control_->props_, previous.get()};
  control_->prepare(update);
  if (update.changed(&OneLinuxControlProps::disabled)) gtk_widget_set_sensitive(control_->widget_, !update.props.disabled);
  control_->apply(update);
  return control_->affectsSize(update);
}

} // namespace facebook::react
