// The window island prototype's React Native side: the shared OneHostRuntime
// runs a React bundle on one Fabric surface, and each mounting transaction is
// flattened into IslandMutations for the Composition host. Events from the
// host's native toggle go to the toggle's Fabric event emitter, and the event
// beat runs on the host's UI thread.
#include "OneWindowsIslandRuntime.h"

#include <cxxreact/JSBigString.h>
#include <hermes/hermes.h>
#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>
#include <react/renderer/components/image/ImageComponentDescriptor.h>
#include <react/renderer/components/root/RootComponentDescriptor.h>
#include <react/renderer/components/scrollview/ScrollViewComponentDescriptor.h>
#include <react/renderer/components/text/ParagraphComponentDescriptor.h>
#include <react/renderer/components/text/RawTextComponentDescriptor.h>
#include <react/renderer/components/text/TextComponentDescriptor.h>
#include <react/renderer/components/view/ViewComponentDescriptor.h>
#include <react/renderer/graphics/Color.h>
#include <react/renderer/imagemanager/ImageManager.h>
#include <react/renderer/mounting/MountingCoordinator.h>
#include <react/renderer/scheduler/SchedulerDelegate.h>

#include <algorithm>
#include <chrono>
#include <cmath>
#include <condition_variable>
#include <fstream>
#include <iterator>
#include <map>
#include <mutex>
#include <thread>
#include <unordered_map>

#include "OneHostRuntime.h"
#include "OneWindowsQueue.h"
#include "OneWindowsToggle.h"

using namespace facebook;
using namespace facebook::react;

namespace one::windows {

namespace {

// timers on one thread of their own; OneTimerRegistry::fire hops to the js
// thread, and a one shot timer's fire disarms it from this thread
class IslandTimerRegistry final : public OneTimerRegistry {
 public:
  IslandTimerRegistry() : thread_([this] { run(); }) {}

  ~IslandTimerRegistry() override
  {
    {
      std::lock_guard<std::mutex> lock(timersMutex_);
      quit_ = true;
    }
    wake_.notify_all();
    thread_.join();
  }

 protected:
  void arm(uint32_t timerID, double delayMS, bool repeats) override
  {
    {
      std::lock_guard<std::mutex> lock(timersMutex_);
      auto period = std::chrono::duration_cast<Clock::duration>(std::chrono::duration<double, std::milli>(delayMS));
      timers_[timerID] = {Clock::now() + period, period, repeats};
    }
    wake_.notify_all();
  }

  void disarm(uint32_t timerID) override
  {
    std::lock_guard<std::mutex> lock(timersMutex_);
    timers_.erase(timerID);
  }

  void disarmAll() override
  {
    std::lock_guard<std::mutex> lock(timersMutex_);
    timers_.clear();
  }

 private:
  using Clock = std::chrono::steady_clock;
  struct Timer {
    Clock::time_point due;
    Clock::duration period;
    bool repeats;
  };

  void run()
  {
    std::unique_lock<std::mutex> lock(timersMutex_);
    while (!quit_) {
      auto next = timers_.end();
      for (auto it = timers_.begin(); it != timers_.end(); ++it) {
        if (next == timers_.end() || it->second.due < next->second.due) {
          next = it;
        }
      }
      if (next == timers_.end()) {
        wake_.wait(lock);
        continue;
      }
      if (next->second.due > Clock::now()) {
        wake_.wait_until(lock, next->second.due);
        continue;
      }
      uint32_t timerID = next->first;
      bool repeats = next->second.repeats;
      if (repeats) {
        next->second.due = Clock::now() + std::max(next->second.period, Clock::duration(std::chrono::milliseconds(1)));
      }
      lock.unlock();
      fire(timerID, repeats);
      lock.lock();
    }
  }

  std::mutex timersMutex_;
  std::condition_variable wake_;
  std::map<uint32_t, Timer> timers_;
  bool quit_{false};
  std::thread thread_;
};

// Requests post the beat to the UI thread, which induces it; Fabric queued the
// event there. The owner box proves the beat is still alive when the post runs.
class IslandEventBeat final : public EventBeat {
 public:
  IslandEventBeat(
      std::shared_ptr<OwnerBox> ownerBox,
      RuntimeScheduler &runtimeScheduler,
      std::function<void(std::function<void()>)> postToUi)
      : EventBeat(std::move(ownerBox), runtimeScheduler), postToUi_(std::move(postToUi)) {}

  void request() const override
  {
    EventBeat::request();
    postToUi_([owner = ownerBox_->owner, this] {
      if (auto alive = owner.lock()) {
        induce();
      }
    });
  }

 private:
  std::function<void(std::function<void()>)> postToUi_;
};

uint32_t argb(const SharedColor &color)
{
  if (!isColorMeaningful(color)) {
    return 0;
  }
  auto c = colorComponentsFromColor(color);
  auto byte = [](float value) { return static_cast<uint32_t>(std::lround(std::clamp(value, 0.0f, 1.0f) * 255)); };
  return byte(c.alpha) << 24 | byte(c.red) << 16 | byte(c.green) << 8 | byte(c.blue);
}

IslandView islandView(const ShadowView &shadowView)
{
  IslandView view;
  view.tag = shadowView.tag;
  view.component = shadowView.componentName;
  const auto &frame = shadowView.layoutMetrics.frame;
  view.x = frame.origin.x;
  view.y = frame.origin.y;
  view.width = frame.size.width;
  view.height = frame.size.height;
  if (const auto *props = dynamic_cast<const ViewProps *>(shadowView.props.get())) {
    view.backgroundColor = argb(props->backgroundColor);
    view.opacity = props->opacity;
  }
  if (const auto *toggle = dynamic_cast<const OneWindowsToggleProps *>(shadowView.props.get())) {
    view.isOn = toggle->isOn;
    view.revision = toggle->revision;
    view.acknowledgedEvent = toggle->acknowledgedEvent;
    view.label = toggle->label;
  }
  return view;
}

// Pulls transactions on the UI thread and hands them to the host flattened.
// Keeps the toggles' event emitters by tag for the host's input. Created on
// the UI thread.
class Mounting final : public SchedulerDelegate, public std::enable_shared_from_this<Mounting> {
 public:
  explicit Mounting(IslandHost host) : host_(std::move(host)), uiThread_(std::this_thread::get_id()) {}

  std::function<void(SurfaceId)> mergeReactRevision;
  std::unordered_map<Tag, std::shared_ptr<const OneWindowsToggleEventEmitter>> toggles;

  void schedulerDidFinishTransaction(const std::shared_ptr<const MountingCoordinator> &) override {}
  void schedulerShouldRenderTransactions(const std::shared_ptr<const MountingCoordinator> &coordinator) override
  {
    // a commit on the UI thread mounts now: stopping a surface commits the
    // empty tree, then destroys its shadow tree, which revokes the coordinator
    // before a posted pull could run
    if (std::this_thread::get_id() == uiThread_) {
      pull(*coordinator);
      return;
    }
    host_.postToUi([weak = weak_from_this(), coordinator] {
      if (auto self = weak.lock()) {
        self->pull(*coordinator);
      }
    });
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
  void pull(const MountingCoordinator &coordinator)
  {
    auto transaction = coordinator.pullTransaction();
    if (!transaction) {
      host_.log("surface " + std::to_string(coordinator.getSurfaceId()) + " had no transaction to pull");
      return;
    }
    std::vector<IslandMutation> mutations;
    mutations.reserve(transaction->getMutations().size());
    for (const auto &mutation : transaction->getMutations()) {
      IslandMutation out;
      out.parentTag = mutation.parentTag;
      out.index = mutation.index;
      bool removing = mutation.type == ShadowViewMutation::Delete || mutation.type == ShadowViewMutation::Remove;
      const auto &shadowView = removing ? mutation.oldChildShadowView : mutation.newChildShadowView;
      out.view = islandView(shadowView);
      switch (mutation.type) {
        case ShadowViewMutation::Create:
          out.type = IslandMutation::Type::Create;
          break;
        case ShadowViewMutation::Delete:
          out.type = IslandMutation::Type::Delete;
          break;
        case ShadowViewMutation::Insert:
          out.type = IslandMutation::Type::Insert;
          break;
        case ShadowViewMutation::Remove:
          out.type = IslandMutation::Type::Remove;
          break;
        case ShadowViewMutation::Update:
          out.type = IslandMutation::Type::Update;
          break;
      }
      if (out.view.component == OneWindowsToggleComponentName) {
        if (mutation.type == ShadowViewMutation::Delete) {
          toggles.erase(shadowView.tag);
        } else if (shadowView.eventEmitter) {
          toggles[shadowView.tag] = std::static_pointer_cast<const OneWindowsToggleEventEmitter>(shadowView.eventEmitter);
        }
      }
      mutations.push_back(std::move(out));
    }
    host_.mount(transaction->getSurfaceId(), static_cast<int>(transaction->getNumber()), mutations);
  }

  IslandHost host_;
  std::thread::id uiThread_;
};

class Runtime final : public IslandRuntime {
 public:
  explicit Runtime(IslandHost host) : host_(std::move(host)), mounting_(std::make_shared<Mounting>(host_))
  {
    width_ = host_.width;
    height_ = host_.height;
    scale_ = host_.scale;
    auto log = host_.log;

    OneHostRuntimeOptions options;
    options.jsThread = std::make_shared<OneWindowsJsThread>();
    options.timerRegistry = std::make_unique<IslandTimerRegistry>();
    options.hasComponentProvider = [](const std::string &name) { return name == OneWindowsToggleComponentName; };
    options.logJsError = [log](const std::string &message) { log("js error: " + message); };
    options.logJsMessage = [log](const std::string &message, unsigned level) {
      log("js log(" + std::to_string(level) + "): " + message);
    };
    OneHostModuleContext &context = options.moduleContext;
    context.scriptURL = "file://" + host_.bundlePath;
    context.osVersion = "windows";
    context.interfaceIdiom = "desktop";
    context.localeIdentifier = "en-US";
    context.windowMetrics = [this] {
      std::lock_guard<std::mutex> lock(metricsMutex_);
      return OneHostWindowMetrics{width_, height_, scale_};
    };
    context.colorScheme = [] { return std::string("light"); };
    context.log = log;
    context.reload = [] {};

    runtime_ = std::make_shared<OneHostRuntime>(std::move(options));
    runtime_->contextContainer()->insert("ImageManager", std::make_shared<ImageManager>(runtime_->contextContainer()));

    auto providers = std::make_shared<ComponentDescriptorProviderRegistry>();
    providers->add(concreteComponentDescriptorProvider<RootComponentDescriptor>());
    providers->add(concreteComponentDescriptorProvider<ViewComponentDescriptor>());
    providers->add(concreteComponentDescriptorProvider<ImageComponentDescriptor>());
    providers->add(concreteComponentDescriptorProvider<ScrollViewComponentDescriptor>());
    providers->add(concreteComponentDescriptorProvider<ParagraphComponentDescriptor>());
    providers->add(concreteComponentDescriptorProvider<TextComponentDescriptor>());
    providers->add(concreteComponentDescriptorProvider<RawTextComponentDescriptor>());
    providers->add(concreteComponentDescriptorProvider<OneWindowsToggleComponentDescriptor>());

    std::weak_ptr<OneHostRuntime> weakRuntime = runtime_;
    auto postToUi = host_.postToUi;
    mounting_->mergeReactRevision = [weakRuntime, postToUi](SurfaceId surfaceId) {
      if (auto runtime = weakRuntime.lock()) {
        runtime->mergeReactRevision(surfaceId, postToUi);
      }
    };
    runtime_->createScheduler(
        providers,
        [](SharedComponentDescriptorRegistry) {},
        [postToUi](std::shared_ptr<EventBeat::OwnerBox> ownerBox, RuntimeScheduler &runtimeScheduler) -> std::unique_ptr<EventBeat> {
          return std::make_unique<IslandEventBeat>(std::move(ownerBox), runtimeScheduler, postToUi);
        },
        mounting_.get());
    runtime_->initializeRuntime();
    runtime_->updateLayout(width_, height_, scale_);
    runtime_->startSurface(host_.appKey, [&](SurfaceId surfaceId) {
      log("surface " + std::to_string(surfaceId) + " started for " + host_.appKey);
    });
    runtime_->instance().loadScript(JSBigFileString::fromPath(host_.bundlePath), "file://" + host_.bundlePath);
  }

  ~Runtime() override
  {
    // the runtime and its scheduler go first, while the delegate they call lives
    runtime_.reset();
  }

  void toggleChanged(int tag, bool isOn, int eventCount, int revision) override
  {
    if (auto emitter = toggleEmitter(tag)) {
      emitter->onIsOnChange(isOn, eventCount, revision);
    }
  }

  void focusChanged(int tag, bool focused) override
  {
    if (auto emitter = toggleEmitter(tag)) {
      emitter->onFocusChange(focused);
    }
  }

  void resize(double width, double height, double scale) override
  {
    {
      std::lock_guard<std::mutex> lock(metricsMutex_);
      width_ = width;
      height_ = height;
      scale_ = scale;
    }
    if (runtime_->updateLayout(width, height, scale)) {
      runtime_->emitDimensions();
    }
  }

  void command(const std::string &name) override
  {
    runtime_->emitDeviceEvent("oneIslandCommand", name);
  }

  void stopSurface() override
  {
    runtime_->stopSurface([this](SurfaceId surfaceId) {
      host_.log("surface " + std::to_string(surfaceId) + " stopped and unregistered");
    });
  }

 private:
  std::shared_ptr<const OneWindowsToggleEventEmitter> toggleEmitter(int tag)
  {
    auto found = mounting_->toggles.find(tag);
    if (found == mounting_->toggles.end()) {
      host_.log("no mounted toggle " + std::to_string(tag) + " for its event");
      return nullptr;
    }
    return found->second;
  }

  IslandHost host_;
  std::shared_ptr<Mounting> mounting_;
  std::shared_ptr<OneHostRuntime> runtime_;
  std::mutex metricsMutex_;
  double width_{0};
  double height_{0};
  double scale_{1};
};

} // namespace

std::unique_ptr<IslandRuntime> createIslandRuntime(IslandHost host)
{
  {
    std::ifstream file(host.bundlePath, std::ios::binary);
    std::string bytes((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());
    auto *hermesAPI = jsi::castInterface<facebook::hermes::IHermesRootAPI>(facebook::hermes::makeHermesRootAPI());
    std::string why;
    if (!hermesAPI->hermesBytecodeSanityCheck(reinterpret_cast<const uint8_t *>(bytes.data()), bytes.size(), &why)) {
      host.log(host.bundlePath + " is not Hermes bytecode: " + why);
      return nullptr;
    }
    host.log(
        "bundle " + host.bundlePath + ": " + std::to_string(bytes.size()) + " bytes of Hermes bytecode, version " +
        std::to_string(hermesAPI->getBytecodeVersion()));
  }
  return std::make_unique<Runtime>(std::move(host));
}

} // namespace one::windows
