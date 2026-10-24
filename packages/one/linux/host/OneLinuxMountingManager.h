#pragma once

#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>
#include <react/renderer/componentregistry/ComponentDescriptorRegistry.h>
#include <react/renderer/mounting/MountingCoordinator.h>
#include <react/renderer/mounting/ShadowViewMutation.h>
#include <react/utils/ContextContainer.h>

#include <functional>
#include <memory>
#include <string>
#include <unordered_map>

#include "OneLinuxView.h"

namespace facebook::react {

// Applies Fabric's mutations to a tree of OneView widgets. Every method runs on
// the GTK main thread; `scheduleTransaction` is the one entry the scheduler
// calls from other threads.
class OneLinuxMountingManager : public std::enable_shared_from_this<OneLinuxMountingManager> {
 public:
  static std::shared_ptr<ComponentDescriptorProviderRegistry> componentDescriptorProviderRegistry();
  static bool hasComponentNamed(const std::string &name);

  OneLinuxMountingManager();
  ~OneLinuxMountingManager();

  // called once, after the first transaction that mounts a view under the root
  std::function<void()> didMount;

  void setContextContainer(std::shared_ptr<const ContextContainer> contextContainer);
  void setComponentDescriptorRegistry(SharedComponentDescriptorRegistry registry);

  void attachSurface(SurfaceId surfaceId, OneView *surfaceView);
  void detachSurface(SurfaceId surfaceId);
  // the root view has no layout metrics of its own; it fills the window
  void setSurfaceSize(double width, double height);

  // any thread
  void scheduleTransaction(std::shared_ptr<const MountingCoordinator> coordinator);

  void synchronouslyUpdateViewOnTag(Tag tag, const folly::dynamic &props);

 struct Record;

 private:

  Record &createView(ComponentHandle handle, Tag tag);
  void initiateTransaction(const MountingCoordinator &coordinator);
  void performMutations(const ShadowViewMutationList &mutations);
  void restyle(Record &record);

  std::unordered_map<Tag, std::unique_ptr<Record>> records_;
  std::shared_ptr<const ContextContainer> contextContainer_;
  SharedComponentDescriptorRegistry componentDescriptorRegistry_;
  SurfaceId surfaceId_{0};
  OneView *surfaceView_{nullptr};
  bool transactionInFlight_{false};
  bool followUpTransactionRequired_{false};
  bool hasContent_{false};
  bool mounted_{false};
};

} // namespace facebook::react
