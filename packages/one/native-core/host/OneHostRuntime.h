#pragma once

#include <ReactCommon/TurboModule.h>
#include <cxxreact/MessageQueueThread.h>
#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>
#include <react/renderer/core/EventBeat.h>
#include <react/renderer/scheduler/Scheduler.h>
#include <react/renderer/scheduler/SchedulerDelegate.h>
#include <react/renderer/scheduler/SurfaceHandler.h>
#include <react/runtime/PlatformTimerRegistry.h>
#include <react/runtime/ReactInstance.h>
#include <react/utils/ContextContainer.h>

#include <functional>
#include <memory>
#include <mutex>
#include <optional>
#include <string>
#include <unordered_map>
#include <unordered_set>

#include "OneHostModule.h"

namespace facebook::react {

// The JavaScript thread: a thread running the platform's event loop, with the
// serial queue contract React's runtime expects. The platform supplies the
// queue itself; the synchronous hop is written once here.
class OneMessageQueueThread : public MessageQueueThread {
 public:
  void runOnQueueSync(std::function<void()> &&work) override;

  virtual bool isOnThread() const = 0;
};

// Timers fire on a platform source; TimerManager hops to the JS thread itself.
// The platform arms and disarms sources and calls `fire` when one expires.
class OneTimerRegistry : public PlatformTimerRegistry {
 public:
  void createTimer(uint32_t timerID, double delayMS) final;
  void createRecurringTimer(uint32_t timerID, double delayMS) final;
  void deleteTimer(uint32_t timerID) final;
  void setTimerManager(std::weak_ptr<TimerManager> timerManager) final;
  void quit() final;

 protected:
  virtual void arm(uint32_t timerID, double delayMS, bool repeats) = 0;
  virtual void disarm(uint32_t timerID) = 0;
  virtual void disarmAll() = 0;

  // called from any thread when a source expires; a one shot timer disarms itself
  void fire(uint32_t timerID, bool repeats);

 private:
  std::mutex mutex_;
  std::weak_ptr<TimerManager> timerManager_;
};

struct OneHostRuntimeOptions {
  std::shared_ptr<OneMessageQueueThread> jsThread;
  std::unique_ptr<OneTimerRegistry> timerRegistry;
  // the platform fills everything but emitDeviceEvent and isJavaScriptQueue
  OneHostModuleContext moduleContext;
  // modules beyond the shared set; it falls back to OneHostCreateTurboModule
  std::function<std::shared_ptr<TurboModule>(
      jsi::Runtime &runtime,
      const std::string &name,
      std::shared_ptr<CallInvoker> jsInvoker,
      const OneHostModuleContext &context)>
      createTurboModule;
  std::function<bool(const std::string &name)> hasComponentProvider;
  // the js thread's uncaught errors and console output
  std::function<void(const std::string &message)> logJsError;
  std::function<void(const std::string &message, unsigned level)> logJsMessage;
};

// One React instance, its scheduler and one surface: the host code both
// platforms share. Create, start the surface and load a script on the main
// thread; destroying it tears the runtime down on the js thread.
class OneHostRuntime : public std::enable_shared_from_this<OneHostRuntime> {
 public:
  using EventBeatFactory =
      std::function<std::unique_ptr<EventBeat>(std::shared_ptr<EventBeat::OwnerBox> ownerBox, RuntimeScheduler &)>;
  using DispatchMain = std::function<void(std::function<void()>)>;

  explicit OneHostRuntime(OneHostRuntimeOptions options);
  ~OneHostRuntime();

  // installs the TurboModule binding, console and component lookup on the js
  // thread; call after createScheduler and before loading a script
  void initializeRuntime();

  ReactInstance &instance() { return *instance_; }
  const std::shared_ptr<ContextContainer> &contextContainer() { return contextContainer_; }
  const std::shared_ptr<OneMessageQueueThread> &jsThread() { return jsThread_; }

  // `registryCreated` receives the component descriptor registry the scheduler
  // builds, which the mounting layer needs to clone props
  void createScheduler(
      std::shared_ptr<ComponentDescriptorProviderRegistry> providers,
      std::function<void(SharedComponentDescriptorRegistry)> registryCreated,
      EventBeatFactory eventBeatFactory,
      SchedulerDelegate *delegate);

  // `attach` runs once the surface is registered, before it starts
  void startSurface(const std::string &moduleName, const std::function<void(SurfaceId)> &attach);
  // `detach` runs after the surface stops and unregisters
  void stopSurface(const std::function<void(SurfaceId)> &detach);

  // returns whether the layout changed
  bool updateLayout(double width, double height, double scale);
  double width() const { return width_; }
  double height() const { return height_; }
  double scale() const { return scale_; }

  void emitDeviceEvent(const std::string &name, folly::dynamic payload);
  void emitDimensions();

  // merges queued react revisions on the main thread, once per burst
  void mergeReactRevision(SurfaceId surfaceId, const DispatchMain &dispatchMain);

 private:
  void applyLayout();

  std::shared_ptr<OneMessageQueueThread> jsThread_;
  OneHostModuleContext moduleContext_;
  decltype(OneHostRuntimeOptions::createTurboModule) createTurboModule_;
  decltype(OneHostRuntimeOptions::hasComponentProvider) hasComponentProvider_;
  decltype(OneHostRuntimeOptions::logJsMessage) logJsMessage_;
  std::shared_ptr<ReactInstance> instance_;
  std::shared_ptr<ContextContainer> contextContainer_;
  std::unique_ptr<Scheduler> scheduler_;
  std::optional<SurfaceHandler> surface_;
  // only the js thread touches the map, so a late call from a stopped runtime
  // can never hand its modules to the next one
  std::shared_ptr<std::unordered_map<std::string, std::shared_ptr<TurboModule>>> turboModules_;

  std::mutex mergeMutex_;
  std::unordered_set<SurfaceId> pendingMerges_;
  double width_{0};
  double height_{0};
  double scale_{1};
};

} // namespace facebook::react
