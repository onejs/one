#pragma once

#include <gtk/gtk.h>
#include <OneLinuxControls.h>
#include <memory>

namespace facebook::react {

class OneLinuxControlImpl;

class OneLinuxControl {
 public:
  static bool supports(ComponentHandle handle);
  explicit OneLinuxControl(ComponentHandle handle);
  ~OneLinuxControl();
  GtkWidget *widget() const;
  bool update(std::shared_ptr<const OneLinuxControlProps> props, EventEmitter::Shared emitter);

 private:
  std::unique_ptr<OneLinuxControlImpl> control_;
};

} // namespace facebook::react
