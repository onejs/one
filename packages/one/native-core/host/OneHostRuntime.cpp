#include "OneHostRuntime.h"

#include <ReactCommon/TurboModuleBinding.h>
#include <jsi/jsi.h>
#include <react/renderer/componentregistry/native/NativeComponentRegistryBinding.h>
#include <react/renderer/core/ReactRootViewTagGenerator.h>
#include <react/renderer/runtimescheduler/RuntimeScheduler.h>
#include <react/renderer/scheduler/SchedulerToolbox.h>
#include <react/runtime/JSRuntimeBindings.h>
#include <react/runtime/TimerManager.h>
#include <react/runtime/hermes/HermesInstance.h>

#include <future>

#include "OneHostModules.h"

namespace facebook::react {

void OneMessageQueueThread::runOnQueueSync(std::function<void()> &&work)
{
  if (isOnThread()) {
    work();
    return;
  }
  std::promise<void> done;
  auto finished = done.get_future();
  runOnQueue([work = std::move(work), &done]() {
    work();
    done.set_value();
  });
  finished.wait();
}

void OneTimerRegistry::setTimerManager(std::weak_ptr<TimerManager> timerManager)
{
  std::lock_guard<std::mutex> lock(mutex_);
  timerManager_ = timerManager;
}

void OneTimerRegistry::createTimer(uint32_t timerID, double delayMS)
{
  arm(timerID, delayMS, false);
}

void OneTimerRegistry::createRecurringTimer(uint32_t timerID, double delayMS)
{
  arm(timerID, delayMS, true);
}

void OneTimerRegistry::deleteTimer(uint32_t timerID)
{
  disarm(timerID);
}

void OneTimerRegistry::quit()
{
  disarmAll();
}

void OneTimerRegistry::fire(uint32_t timerID, bool repeats)
{
  std::shared_ptr<TimerManager> manager;
  {
    std::lock_guard<std::mutex> lock(mutex_);
    manager = timerManager_.lock();
  }
  if (!repeats) {
    disarm(timerID);
  }
  if (manager) {
    manager->callTimer(timerID);
  }
}

OneHostRuntime::OneHostRuntime(OneHostRuntimeOptions options) : jsThread_(std::move(options.jsThread))
{
  auto timerRegistry = std::move(options.timerRegistry);
  auto *timerRegistryPtr = timerRegistry.get();
  auto timerManager = std::make_shared<TimerManager>(std::move(timerRegistry));
  timerRegistryPtr->setTimerManager(timerManager);

  auto logJsError = options.logJsError;
  auto onJsError = [logJsError](jsi::Runtime &, const JsErrorHandler::ProcessedError &error) {
    logJsError(error.message);
  };

  instance_ = std::make_shared<ReactInstance>(
      HermesInstance::createJSRuntime(nullptr, jsThread_, false), jsThread_, timerManager, onJsError);
  timerManager->setRuntimeExecutor(instance_->getBufferedRuntimeExecutor());

  std::weak_ptr<ReactInstance> weakInstance = instance_;
  std::weak_ptr<OneMessageQueueThread> weakJsThread = jsThread_;

  moduleContext_ = std::move(options.moduleContext);
  createTurboModule_ = std::move(options.createTurboModule);
  hasComponentProvider_ = std::move(options.hasComponentProvider);
  logJsMessage_ = std::move(options.logJsMessage);
  auto &moduleContext = moduleContext_;
  moduleContext.emitDeviceEvent = [weakInstance](const std::string &name, folly::dynamic payload) {
    if (auto instance = weakInstance.lock()) {
      instance->callFunctionOnModule("RCTDeviceEventEmitter", "emit", folly::dynamic::array(name, std::move(payload)));
    }
  };
  moduleContext.isJavaScriptQueue = [weakJsThread]() {
    auto jsThread = weakJsThread.lock();
    return jsThread && jsThread->isOnThread();
  };

  contextContainer_ = std::make_shared<ContextContainer>();
  contextContainer_->insert(RuntimeSchedulerKey, std::weak_ptr<RuntimeScheduler>(instance_->getRuntimeScheduler()));
  turboModules_ = std::make_shared<std::unordered_map<std::string, std::shared_ptr<TurboModule>>>();
}

void OneHostRuntime::initializeRuntime()
{
  auto jsCallInvoker = instance_->createJSCallInvoker();
  auto turboModules = turboModules_;
  auto moduleContext = moduleContext_;
  auto createTurboModule = createTurboModule_;
  auto hasComponentProvider = hasComponentProvider_;
  auto logJsMessage = logJsMessage_;
  instance_->initializeRuntime(
      {}, [turboModules, jsCallInvoker, moduleContext, createTurboModule, hasComponentProvider, logJsMessage](jsi::Runtime &runtime) {
        TurboModuleBinding::install(
            runtime,
            [turboModules, jsCallInvoker, moduleContext, createTurboModule](
                jsi::Runtime &moduleRuntime, const std::string &name) -> std::shared_ptr<TurboModule> {
              auto found = turboModules->find(name);
              if (found != turboModules->end()) {
                return found->second;
              }
              auto module = createTurboModule ? createTurboModule(moduleRuntime, name, jsCallInvoker, moduleContext)
                                              : OneHostCreateTurboModule(name, jsCallInvoker, moduleContext);
              (*turboModules)[name] = module;
              return module;
            });
        bindNativeLogger(runtime, logJsMessage);
        // hermes has no console of its own, so route it through the native logger
        // before the bundle's own empty console stubs can claim the names
        runtime.evaluateJavaScript(
            std::make_shared<jsi::StringBuffer>(
                "globalThis.console = {};"
                "['log', 'info', 'warn', 'error', 'debug', 'trace'].forEach(function (name, level) {"
                "  console[name] = function () {"
                "    nativeLoggingHook(Array.prototype.map.call(arguments, function (value) {"
                "      return typeof value === 'string' ? value : (value && value.stack) || String(value);"
                "    }).join(' '), level);"
                "  };"
                "});"),
            "one-host-console");
        auto provider = hasComponentProvider;
        bindHasComponentProvider(runtime, std::move(provider));
      });
}

OneHostRuntime::~OneHostRuntime()
{
  scheduler_.reset();

  auto instance = std::move(instance_);
  auto modules = std::move(turboModules_);
  // the instance and its modules must die on the js thread
  jsThread_->runOnQueueSync([&] {
    modules->clear();
    instance.reset();
  });
  jsThread_->quitSynchronous();
}

void OneHostRuntime::createScheduler(
    std::shared_ptr<ComponentDescriptorProviderRegistry> providers,
    std::function<void(SharedComponentDescriptorRegistry)> registryCreated,
    EventBeatFactory eventBeatFactory,
    SchedulerDelegate *delegate)
{
  auto runtimeScheduler = instance_->getRuntimeScheduler();

  SchedulerToolbox toolbox;
  toolbox.contextContainer = contextContainer_;
  toolbox.componentRegistryFactory = [providers, registryCreated = std::move(registryCreated)](
                                         const EventDispatcher::Weak &eventDispatcher,
                                         const std::shared_ptr<const ContextContainer> &container) {
    auto descriptors = providers->createComponentDescriptorRegistry({.eventDispatcher = eventDispatcher, .contextContainer = container});
    registryCreated(descriptors);
    return descriptors;
  };
  // buffered so surface start waits for the bundle that installs RN$AppRegistry
  toolbox.runtimeExecutor = instance_->getBufferedRuntimeExecutor();
  toolbox.bridgelessBindingsExecutor = instance_->getUnbufferedRuntimeExecutor();
  toolbox.eventBeatFactory = [runtimeScheduler, eventBeatFactory = std::move(eventBeatFactory)](
                                 std::shared_ptr<EventBeat::OwnerBox> ownerBox) -> std::unique_ptr<EventBeat> {
    return eventBeatFactory(std::move(ownerBox), *runtimeScheduler);
  };

  scheduler_ = std::make_unique<Scheduler>(toolbox, nullptr, delegate);
}

void OneHostRuntime::startSurface(const std::string &moduleName, const std::function<void(SurfaceId)> &attach)
{
  surface_.emplace(moduleName, getNextRootViewTag());
  surface_->setProps(folly::dynamic::object());
  scheduler_->registerSurface(*surface_);
  attach(surface_->getSurfaceId());
  applyLayout();
  surface_->start();
}

void OneHostRuntime::stopSurface(const std::function<void(SurfaceId)> &detach)
{
  if (surface_) {
    surface_->stop();
    scheduler_->unregisterSurface(*surface_);
    detach(surface_->getSurfaceId());
    surface_.reset();
  }
}

bool OneHostRuntime::updateLayout(double width, double height, double scale)
{
  bool changed = width_ != width || height_ != height || scale_ != scale;
  width_ = width;
  height_ = height;
  scale_ = scale;
  if (changed) {
    applyLayout();
  }
  return changed;
}

void OneHostRuntime::applyLayout()
{
  if (!surface_) {
    return;
  }
  LayoutConstraints constraints = surface_->getLayoutConstraints();
  LayoutContext context = surface_->getLayoutContext();
  facebook::react::Size size{static_cast<Float>(width_), static_cast<Float>(height_)};
  constraints.minimumSize = size;
  constraints.maximumSize = size;
  constraints.layoutDirection = LayoutDirection::LeftToRight;
  context.pointScaleFactor = static_cast<Float>(scale_);
  context.fontSizeMultiplier = 1;
  context.viewportSize = size;
  surface_->constraintLayout(constraints, context);
}

void OneHostRuntime::emitDeviceEvent(const std::string &name, folly::dynamic payload)
{
  instance_->callFunctionOnModule("RCTDeviceEventEmitter", "emit", folly::dynamic::array(name, std::move(payload)));
}

void OneHostRuntime::emitDimensions()
{
  folly::dynamic dims = folly::dynamic::object("width", width_)("height", height_)("scale", scale_)("fontScale", 1);
  emitDeviceEvent("didUpdateDimensions", folly::dynamic::object("window", dims)("screen", dims));
}

void OneHostRuntime::mergeReactRevision(SurfaceId surfaceId, const DispatchMain &dispatchMain)
{
  bool needsDispatch = false;
  {
    std::lock_guard<std::mutex> lock(mergeMutex_);
    needsDispatch = pendingMerges_.empty();
    pendingMerges_.insert(surfaceId);
  }
  if (!needsDispatch) {
    return;
  }
  std::weak_ptr<OneHostRuntime> weakSelf = weak_from_this();
  dispatchMain([weakSelf]() {
    auto self = weakSelf.lock();
    if (!self) {
      return;
    }
    std::unordered_set<SurfaceId> pending;
    {
      std::lock_guard<std::mutex> lock(self->mergeMutex_);
      pending.swap(self->pendingMerges_);
    }
    if (!self->scheduler_) {
      return;
    }
    auto uiManager = self->scheduler_->getUIManager();
    for (auto id : pending) {
      uiManager->getShadowTreeRegistry().visit(id, [](const ShadowTree &tree) { tree.mergeReactRevision(); });
    }
  });
}

} // namespace facebook::react
