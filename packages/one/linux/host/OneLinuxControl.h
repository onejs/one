#pragma once

#include <gtk/gtk.h>
#include <OneLinuxControls.h>
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
  void report(double value);

  ComponentHandle handle_;
  GtkWidget *widget_;
  EventEmitter::Shared emitter_;
  std::vector<std::string> labels_;
  OneLinuxControlledValue<double> value_;
};

} // namespace facebook::react
