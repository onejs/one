#pragma once

#include <gtk/gtk.h>
#include <OneLinuxControls.h>

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
  double value_{0};
  int revision_{0};
  int eventCount_{0};
  bool applying_{false};
};

} // namespace facebook::react
