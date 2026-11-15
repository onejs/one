// headless smoke test of the Linux core: a ReactInstance on Hermes evaluates a
// Hermes bytecode file, and a Scheduler registers the core component
// descriptors. No window and no toolkit.
#include <ReactCommon/RuntimeExecutor.h>
#include <cxxreact/JSBigString.h>
#include <cxxreact/MessageQueueThread.h>
#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>
#include <react/renderer/components/image/ImageComponentDescriptor.h>
#include <react/renderer/components/root/RootComponentDescriptor.h>
#include <react/renderer/components/scrollview/ScrollViewComponentDescriptor.h>
#include <react/renderer/components/text/ParagraphComponentDescriptor.h>
#include <react/renderer/components/text/RawTextComponentDescriptor.h>
#include <react/renderer/components/text/TextComponentDescriptor.h>
#include <react/renderer/components/textinput/platform/ios/react/renderer/components/iostextinput/TextInputComponentDescriptor.h>
#include <react/renderer/components/view/ViewComponentDescriptor.h>
#include <react/renderer/core/EventBeat.h>
#include <react/renderer/imagemanager/ImageManager.h>
#include <react/renderer/scheduler/Scheduler.h>
#include <react/renderer/scheduler/SchedulerDelegate.h>
#include <react/renderer/scheduler/SchedulerToolbox.h>
#include <react/runtime/PlatformTimerRegistry.h>
#include <react/runtime/ReactInstance.h>
#include <react/runtime/TimerManager.h>
#include <react/runtime/hermes/HermesInstance.h>
#include <react/utils/ContextContainer.h>

#include <chrono>
#include <condition_variable>
#include <cstdio>
#include <deque>
#include <future>
#include <mutex>
#include <thread>

using namespace facebook;
using namespace facebook::react;

namespace {

// one thread draining a queue, the serial contract the runtime expects
class SmokeMessageQueueThread : public MessageQueueThread {
 public:
  SmokeMessageQueueThread() : thread_([this] { run(); }) {}
  ~SmokeMessageQueueThread() override {
    quitSynchronous();
  }

  void runOnQueue(std::function<void()> &&work) override {
    {
      std::lock_guard<std::mutex> lock(mutex_);
      if (quit_) {
        return;
      }
      queue_.push_back(std::move(work));
    }
    wake_.notify_one();
  }

  void runOnQueueSync(std::function<void()> &&work) override {
    if (std::this_thread::get_id() == thread_.get_id()) {
      work();
      return;
    }
    std::promise<void> done;
    runOnQueue([&] {
      work();
      done.set_value();
    });
    done.get_future().wait();
  }

  void quitSynchronous() override {
    {
      std::lock_guard<std::mutex> lock(mutex_);
      if (quit_) {
        return;
      }
      quit_ = true;
    }
    wake_.notify_one();
    if (std::this_thread::get_id() != thread_.get_id()) {
      thread_.join();
    }
  }

 private:
  void run() {
    for (;;) {
      std::function<void()> work;
      {
        std::unique_lock<std::mutex> lock(mutex_);
        wake_.wait(lock, [this] { return quit_ || !queue_.empty(); });
        if (queue_.empty()) {
          return;
        }
        work = std::move(queue_.front());
        queue_.pop_front();
      }
      work();
    }
  }

  std::mutex mutex_;
  std::condition_variable wake_;
  std::deque<std::function<void()>> queue_;
  bool quit_{false};
  std::thread thread_;
};

class SmokeTimerRegistry : public PlatformTimerRegistry {
 public:
  void createTimer(uint32_t, double) override {}
  void deleteTimer(uint32_t) override {}
  void createRecurringTimer(uint32_t, double) override {}
};

class SmokeEventBeat : public EventBeat {
 public:
  using EventBeat::EventBeat;
};

class SmokeSchedulerDelegate final : public SchedulerDelegate {
 public:
  void schedulerDidFinishTransaction(const std::shared_ptr<const MountingCoordinator> &) override {}
  void schedulerShouldRenderTransactions(const std::shared_ptr<const MountingCoordinator> &) override {}
  void schedulerShouldMergeReactRevision(SurfaceId) override {}
  void schedulerDidRequestPreliminaryViewAllocation(const ShadowNode &) override {}
  void schedulerDidDispatchCommand(const ShadowView &, const std::string &, const folly::dynamic &) override {}
  void schedulerDidSendAccessibilityEvent(const ShadowView &, const std::string &) override {}
  void schedulerDidSetIsJSResponder(const ShadowView &, bool, bool) override {}
  void schedulerShouldSynchronouslyUpdateViewOnUIThread(Tag, const folly::dynamic &) override {}
  void schedulerDidUpdateShadowTree(const std::unordered_map<Tag, folly::dynamic> &) override {}
  void schedulerDidCaptureViewSnapshot(Tag, SurfaceId) override {}
  void schedulerDidSetViewSnapshot(Tag, Tag, SurfaceId) override {}
  void schedulerDidClearPendingSnapshots() override {}
};

} // namespace

int main(int argc, char **argv) {
  if (argc != 2) {
    std::fprintf(stderr, "usage: one-linux-smoke <bundle.hbc>\n");
    return 2;
  }

  auto jsThread = std::make_shared<SmokeMessageQueueThread>();
  auto timerRegistry = std::make_unique<SmokeTimerRegistry>();
  auto timerManager = std::make_shared<TimerManager>(std::move(timerRegistry));

  auto onJsError = [](jsi::Runtime &, const JsErrorHandler::ProcessedError &error) {
    std::fprintf(stderr, "js error: %s\n", error.message.c_str());
  };

  auto instance = std::make_shared<ReactInstance>(
      HermesInstance::createJSRuntime(nullptr, jsThread, false), jsThread, timerManager, onJsError);
  timerManager->setRuntimeExecutor(instance->getBufferedRuntimeExecutor());

  std::mutex mutex;
  std::condition_variable evaluated;
  bool done = false;
  std::string result;

  instance->initializeRuntime({}, [&](jsi::Runtime &runtime) {
    runtime.global().setProperty(
        runtime,
        "smokeDone",
        jsi::Function::createFromHostFunction(
            runtime,
            jsi::PropNameID::forAscii(runtime, "smokeDone"),
            2,
            [&](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) -> jsi::Value {
              std::lock_guard<std::mutex> lock(mutex);
              result = std::to_string(args[0].asNumber()) + " " + args[1].asString(rt).utf8(rt);
              done = true;
              evaluated.notify_all();
              return jsi::Value::undefined();
            }));
  });

  auto registry = std::make_shared<ComponentDescriptorProviderRegistry>();
  registry->add(concreteComponentDescriptorProvider<RootComponentDescriptor>());
  registry->add(concreteComponentDescriptorProvider<ViewComponentDescriptor>());
  registry->add(concreteComponentDescriptorProvider<ImageComponentDescriptor>());
  registry->add(concreteComponentDescriptorProvider<TextInputComponentDescriptor>());
  registry->add(concreteComponentDescriptorProvider<ScrollViewComponentDescriptor>());
  registry->add(concreteComponentDescriptorProvider<ParagraphComponentDescriptor>());
  registry->add(concreteComponentDescriptorProvider<TextComponentDescriptor>());
  registry->add(concreteComponentDescriptorProvider<RawTextComponentDescriptor>());

  auto contextContainer = std::make_shared<ContextContainer>();
  contextContainer->insert(RuntimeSchedulerKey, std::weak_ptr<RuntimeScheduler>(instance->getRuntimeScheduler()));
  contextContainer->insert("ImageManager", std::make_shared<ImageManager>(contextContainer));

  auto runtimeScheduler = instance->getRuntimeScheduler();
  SchedulerToolbox toolbox;
  toolbox.contextContainer = contextContainer;
  toolbox.componentRegistryFactory = [registry](
                                         const EventDispatcher::Weak &eventDispatcher,
                                         const std::shared_ptr<const ContextContainer> &container) {
    return registry->createComponentDescriptorRegistry(
        {.eventDispatcher = eventDispatcher, .contextContainer = container});
  };
  toolbox.runtimeExecutor = instance->getBufferedRuntimeExecutor();
  toolbox.bridgelessBindingsExecutor = instance->getUnbufferedRuntimeExecutor();
  toolbox.eventBeatFactory = [runtimeScheduler](std::shared_ptr<EventBeat::OwnerBox> ownerBox) {
    return std::make_unique<SmokeEventBeat>(std::move(ownerBox), *runtimeScheduler);
  };

  SmokeSchedulerDelegate delegate;
  auto scheduler = std::make_unique<Scheduler>(toolbox, nullptr, &delegate);
  std::printf("scheduler created with %zu component descriptors\n", static_cast<size_t>(8));

  instance->loadScript(JSBigFileString::fromPath(argv[1]), std::string("file://") + argv[1]);

  std::unique_lock<std::mutex> lock(mutex);
  if (!evaluated.wait_for(lock, std::chrono::seconds(10), [&] { return done; })) {
    std::fprintf(stderr, "bytecode did not evaluate within 10 seconds\n");
    return 1;
  }
  std::printf("hermes evaluated bytecode %s, smokeDone(%s)\n", argv[1], result.c_str());
  lock.unlock();

  scheduler.reset();
  instance->unregisterFromInspector();
  instance.reset();
  jsThread->quitSynchronous();
  return 0;
}
