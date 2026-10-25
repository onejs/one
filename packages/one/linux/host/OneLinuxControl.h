#pragma once

#include <gtk/gtk.h>
#include <OneLinuxControls.h>
#include <set>
#include <optional>
#include "OneLinuxControlledValue.h"

namespace facebook::react {

class OneLinuxControl {
 public:
  static bool supports(ComponentHandle handle);
  explicit OneLinuxControl(ComponentHandle handle);
  ~OneLinuxControl();
  GtkWidget *widget() const { return widget_; }
  void update(const OneLinuxControlProps &props, EventEmitter::Shared emitter);

 private:
  static void clicked(GtkButton *, gpointer);
  static void toggled(GtkToggleButton *, gpointer);
  static void slid(GtkRange *, gpointer);
  static void selected(GObject *, GParamSpec *, gpointer);
  static void checked(GtkCheckButton *, gpointer);
  static void stepped(GtkSpinButton *, gpointer);
  static void edited(GtkEditable *, gpointer);
  static void submitted(GtkWidget *, gpointer);
  static gboolean sliderEvent(GtkEventControllerLegacy *, GdkEvent *, gpointer);
  void beginSliding();
  void endSliding();
  void finishSliding();
  void cancelSliding();
  void report(double value);

  ComponentHandle handle_;
  GtkWidget *widget_;
  GtkSpinButton *stepper_{nullptr};
  GtkWidget *stepperLabel_{nullptr};
  EventEmitter::Shared emitter_;
  std::vector<std::string> labels_;
  std::vector<std::string> itemValues_;
  bool tagged_{false};
  OneLinuxControlledValue<double> value_;
  OneLinuxControlledValue<std::string> text_;
  OneLinuxControlledValue<std::optional<std::string>> selection_;
  GtkEventController *interactionController_{nullptr};
  std::set<guint> sliderKeys_;
  bool sliderPointer_{false};
  bool sliding_{false};
  int slidingRevision_{0};
  guint completionSource_{0};
  guint progressTick_{0};
  gint64 lastPulse_{0};
};

} // namespace facebook::react
