// headless smoke test of the Windows core: the shared OneHostRuntime runs a
// ReactInstance on Hermes, starts a Fabric surface, evaluates a Hermes bytecode
// bundle whose RN$AppRegistry builds a tree through nativeFabricUIManager, and
// checks the frames Yoga laid out in the mounting transactions. No window.
#include <cxxreact/JSBigString.h>
#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>
#include <react/renderer/components/image/ImageComponentDescriptor.h>
#include <react/renderer/components/root/RootComponentDescriptor.h>
#include <react/renderer/components/scrollview/ScrollViewComponentDescriptor.h>
#include <react/renderer/components/text/ParagraphComponentDescriptor.h>
#include <react/renderer/components/text/RawTextComponentDescriptor.h>
#include <react/renderer/components/text/TextComponentDescriptor.h>
#include <react/renderer/components/view/ViewComponentDescriptor.h>
#include <react/renderer/imagemanager/ImageManager.h>
#include <react/renderer/mounting/MountingCoordinator.h>
#include <react/renderer/scheduler/SchedulerDelegate.h>

#include <chrono>
#include <condition_variable>
#include <cstdio>
#include <deque>
#include <map>
#include <mutex>
#include <thread>

#include "OneHostRuntime.h"

using namespace facebook;
using namespace facebook::react;

namespace {

// a thread draining a queue, the serial contract the runtime expects
class SmokeQueue {
 public:
  void post(std::function<void()> &&work)
  {
    {
      std::lock_guard<std::mutex> lock(mutex_);
      if (quit_) {
        return;
      }
      queue_.push_back(std::move(work));
    }
    wake_.notify_one();
  }

  // runs posted work on the calling thread until quit and the queue is drained
  void run()
  {
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

  // runs posted work on the calling thread until `done` or the deadline;
  // `done` reads state that notify() announces
  bool runUntil(const std::function<bool()> &done, std::chrono::steady_clock::time_point deadline)
  {
    for (;;) {
      std::function<void()> work;
      {
        std::unique_lock<std::mutex> lock(mutex_);
        wake_.wait_until(lock, deadline, [&] { return !queue_.empty() || done(); });
        if (done()) {
          return true;
        }
        if (queue_.empty()) {
          return false;
        }
        work = std::move(queue_.front());
        queue_.pop_front();
      }
      work();
    }
  }

  void quit()
  {
    {
      std::lock_guard<std::mutex> lock(mutex_);
      quit_ = true;
    }
    wake_.notify_all();
  }

  // wakes runUntil to recheck its condition; call without holding a lock
  // `done` takes
  void notify()
  {
    { std::lock_guard<std::mutex> lock(mutex_); }
    wake_.notify_all();
  }

 private:
  std::mutex mutex_;
  std::condition_variable wake_;
  std::deque<std::function<void()>> queue_;
  bool quit_{false};
};

class SmokeMessageQueueThread : public OneMessageQueueThread {
 public:
  SmokeMessageQueueThread() : thread_([this] { queue_.run(); }) {}
  ~SmokeMessageQueueThread() override
  {
    quitSynchronous();
  }

  void runOnQueue(std::function<void()> &&work) override
  {
    queue_.post(std::move(work));
  }

  void quitSynchronous() override
  {
    queue_.quit();
    if (thread_.joinable() && std::this_thread::get_id() != thread_.get_id()) {
      thread_.join();
    }
  }

  bool isOnThread() const override
  {
    return std::this_thread::get_id() == thread_.get_id();
  }

 private:
  SmokeQueue queue_;
  std::thread thread_;
};

// the bundle sets no timers
class SmokeTimerRegistry : public OneTimerRegistry {
 protected:
  void arm(uint32_t, double, bool) override {}
  void disarm(uint32_t) override {}
  void disarmAll() override {}
};

class SmokeEventBeat : public EventBeat {
 public:
  using EventBeat::EventBeat;
};

struct Frame {
  Float x, y, width, height;
};

// what the bundle's styles lay out to on an 800x600 surface
const std::map<Tag, Frame> kExpectedFrames = {
    {2, {0, 0, 800, 600}},
    {4, {20, 20, 100, 50}},
    {6, {130, 20, 450, 50}},
    {8, {580, 20, 200, 560}},
};

class SmokeSchedulerDelegate final : public SchedulerDelegate {
 public:
  explicit SmokeSchedulerDelegate(SmokeQueue &main) : main_(main) {}

  std::function<void(SurfaceId)> mergeReactRevision;
  std::mutex mutex;
  std::map<Tag, std::pair<std::string, Frame>> mounted;
  size_t transactions{0};
  size_t mutations{0};

  void schedulerDidFinishTransaction(const std::shared_ptr<const MountingCoordinator> &) override {}
  void schedulerShouldRenderTransactions(const std::shared_ptr<const MountingCoordinator> &coordinator) override
  {
    main_.post([this, coordinator] { pull(*coordinator); });
  }
  void schedulerShouldMergeReactRevision(SurfaceId surfaceId) override
  {
    mergeReactRevision(surfaceId);
  }
  void schedulerDidRequestPreliminaryViewAllocation(const ShadowNode &) override {}
  void schedulerDidDispatchCommand(const ShadowView &, const std::string &, const folly::dynamic &) override {}
  void schedulerDidSendAccessibilityEvent(const ShadowView &, const std::string &) override {}
  void schedulerDidSetIsJSResponder(const ShadowView &, bool, bool) override {}
  void schedulerShouldSynchronouslyUpdateViewOnUIThread(Tag, const folly::dynamic &) override {}
  void schedulerDidUpdateShadowTree(const std::unordered_map<Tag, folly::dynamic> &) override {}
  void schedulerDidCaptureViewSnapshot(Tag, SurfaceId) override {}
  void schedulerDidSetViewSnapshot(Tag, Tag, SurfaceId) override {}
  void schedulerDidClearPendingSnapshots() override {}

 private:
  // the mounting layer's side: pull the transaction on the main thread and keep
  // each created or updated view's frame
  void pull(const MountingCoordinator &coordinator)
  {
    auto transaction = coordinator.pullTransaction();
    if (!transaction) {
      return;
    }
    {
      std::lock_guard<std::mutex> lock(mutex);
      transactions++;
      for (const auto &mutation : transaction->getMutations()) {
        mutations++;
        if (mutation.type == ShadowViewMutation::Insert || mutation.type == ShadowViewMutation::Update) {
          const auto &view = mutation.newChildShadowView;
          const auto &frame = view.layoutMetrics.frame;
          mounted[view.tag] = {view.componentName, {frame.origin.x, frame.origin.y, frame.size.width, frame.size.height}};
        }
      }
    }
    main_.notify();
  }

  SmokeQueue &main_;
};

} // namespace

int main(int argc, char **argv)
{
  if (argc != 2) {
    std::fprintf(stderr, "usage: one-windows-smoke <bundle.hbc>\n");
    return 2;
  }
  std::string bundlePath = argv[1];
  setvbuf(stdout, nullptr, _IONBF, 0);

  SmokeQueue main;
  std::mutex errorMutex;
  std::string jsError;

  OneHostRuntimeOptions options;
  options.jsThread = std::make_shared<SmokeMessageQueueThread>();
  options.timerRegistry = std::make_unique<SmokeTimerRegistry>();
  options.hasComponentProvider = [](const std::string &) { return false; };
  options.logJsError = [&](const std::string &message) {
    std::fprintf(stderr, "js error: %s\n", message.c_str());
    {
      std::lock_guard<std::mutex> lock(errorMutex);
      jsError = message;
    }
    main.notify();
  };
  options.logJsMessage = [](const std::string &message, unsigned level) {
    std::printf("js log(%u): %s\n", level, message.c_str());
  };
  OneHostModuleContext &context = options.moduleContext;
  context.scriptURL = "file://" + bundlePath;
  context.osVersion = "windows";
  context.interfaceIdiom = "desktop";
  context.localeIdentifier = "en-US";
  context.windowMetrics = [] { return OneHostWindowMetrics{800, 600, 1}; };
  context.colorScheme = [] { return std::string("light"); };
  context.log = [](const std::string &line) { std::fprintf(stderr, "[one-windows-smoke] %s\n", line.c_str()); };
  context.reload = [] {};

  auto runtime = std::make_shared<OneHostRuntime>(std::move(options));
  runtime->contextContainer()->insert("ImageManager", std::make_shared<ImageManager>(runtime->contextContainer()));

  auto providers = std::make_shared<ComponentDescriptorProviderRegistry>();
  providers->add(concreteComponentDescriptorProvider<RootComponentDescriptor>());
  providers->add(concreteComponentDescriptorProvider<ViewComponentDescriptor>());
  providers->add(concreteComponentDescriptorProvider<ImageComponentDescriptor>());
  providers->add(concreteComponentDescriptorProvider<ScrollViewComponentDescriptor>());
  providers->add(concreteComponentDescriptorProvider<ParagraphComponentDescriptor>());
  providers->add(concreteComponentDescriptorProvider<TextComponentDescriptor>());
  providers->add(concreteComponentDescriptorProvider<RawTextComponentDescriptor>());

  SmokeSchedulerDelegate delegate(main);
  std::weak_ptr<OneHostRuntime> weakRuntime = runtime;
  delegate.mergeReactRevision = [weakRuntime, &main](SurfaceId surfaceId) {
    if (auto runtime = weakRuntime.lock()) {
      runtime->mergeReactRevision(surfaceId, [&main](std::function<void()> work) { main.post(std::move(work)); });
    }
  };

  runtime->createScheduler(
      providers,
      [](SharedComponentDescriptorRegistry) {},
      [](std::shared_ptr<EventBeat::OwnerBox> ownerBox, RuntimeScheduler &runtimeScheduler) -> std::unique_ptr<EventBeat> {
        return std::make_unique<SmokeEventBeat>(std::move(ownerBox), runtimeScheduler);
      },
      &delegate);
  runtime->initializeRuntime();
  runtime->updateLayout(800, 600, 1);
  SurfaceId surfaceId = -1;
  runtime->startSurface("OneWindowsSmoke", [&](SurfaceId id) { surfaceId = id; });
  std::printf("surface %d started at 800x600 with 7 component descriptors\n", surfaceId);

  runtime->instance().loadScript(JSBigFileString::fromPath(bundlePath), "file://" + bundlePath);

  auto laidOut = [&] {
    std::lock_guard<std::mutex> errorLock(errorMutex);
    std::lock_guard<std::mutex> lock(delegate.mutex);
    if (!jsError.empty()) {
      return true;
    }
    for (const auto &[tag, frame] : kExpectedFrames) {
      if (!delegate.mounted.contains(tag)) {
        return false;
      }
    }
    return true;
  };
  bool finished = main.runUntil(laidOut, std::chrono::steady_clock::now() + std::chrono::seconds(20));

  int failures = 0;
  {
    std::lock_guard<std::mutex> lock(delegate.mutex);
    std::printf("%zu transactions, %zu mutations, %zu views mounted\n", delegate.transactions, delegate.mutations, delegate.mounted.size());
    for (const auto &[tag, entry] : delegate.mounted) {
      const auto &[name, frame] = entry;
      auto expected = kExpectedFrames.find(tag);
      bool ok = expected == kExpectedFrames.end() ||
          (frame.x == expected->second.x && frame.y == expected->second.y && frame.width == expected->second.width &&
           frame.height == expected->second.height);
      std::printf(
          "  view %d %s frame {%g, %g, %g, %g}%s\n",
          tag,
          name.c_str(),
          frame.x,
          frame.y,
          frame.width,
          frame.height,
          expected == kExpectedFrames.end() ? "" : ok ? " ok" : " MISMATCH");
      failures += ok ? 0 : 1;
    }
    for (const auto &[tag, frame] : kExpectedFrames) {
      if (!delegate.mounted.contains(tag)) {
        std::printf("  view %d never mounted\n", tag);
        failures++;
      }
    }
  }
  if (!finished) {
    std::fprintf(stderr, "the tree did not lay out within 20 seconds\n");
    failures++;
  }
  {
    std::lock_guard<std::mutex> lock(errorMutex);
    failures += jsError.empty() ? 0 : 1;
  }

  runtime->stopSurface([](SurfaceId) {});
  runtime->instance().unregisterFromInspector();
  runtime.reset();

  std::printf(failures ? "smoke FAILED with %d failures\n" : "smoke passed\n", failures);
  return failures ? 1 : 0;
}
