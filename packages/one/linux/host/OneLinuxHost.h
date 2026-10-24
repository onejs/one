#pragma once

#include <glib.h>

#include <memory>
#include <mutex>
#include <string>

#include "OneLinuxMountingManager.h"
#include "OneLinuxView.h"

namespace facebook::react {

class OneHostRuntime;

// One React instance and surface mounted into a surface view. Everything is
// created on the GTK main thread and torn down with `stop`, which `reload`
// pairs with a fresh `start`.
class OneLinuxHost {
 public:
  // `bundlePath` is a Hermes bytecode bundle or plain JavaScript file
  OneLinuxHost(std::string bundlePath, std::string moduleName, OneView *surface);
  ~OneLinuxHost();

  void start();
  void stop();
  void reload();

  // the surface view calls this on every size or scale change
  void updateLayout(double width, double height, double scale);

 private:
  class SchedulerDelegate;

  std::string bundlePath_;
  std::string moduleName_;
  OneView *surface_;
  std::shared_ptr<OneLinuxMountingManager> mountingManager_;
  std::shared_ptr<ComponentDescriptorProviderRegistry> providerRegistry_;
  std::shared_ptr<OneHostRuntime> runtime_;
  std::unique_ptr<SchedulerDelegate> schedulerDelegate_;

  std::mutex metricsMutex_;
  double width_{0};
  double height_{0};
  double scale_{1};
  guint generation_{0};
};

} // namespace facebook::react
