#include "OneLinuxHost.h"

#include <AppleEventBeat.h>
#include <cxxreact/JSBigString.h>
#include <react/renderer/scheduler/SchedulerDelegate.h>

#include <sys/utsname.h>

#include <cstdio>

#include "OneHostRuntime.h"
#include "OneHostModules.h"
#include "OneLinuxModules.h"
#include "OneLinuxNetwork.h"
#include "OneLinuxNitro.h"
#include "OneLinuxOpSqlite.h"
#include "OneLinuxRuntime.h"
#include "OneLinuxStartup.h"
#include "OneLinuxWorklets.h"

#include <gtk/gtk.h>

namespace facebook::react {

class OneLinuxHost::SchedulerDelegate final : public facebook::react::SchedulerDelegate {
 public:
  explicit SchedulerDelegate(std::weak_ptr<OneLinuxMountingManager> manager) : manager_(std::move(manager)) {}

  void schedulerDidFinishTransaction(const std::shared_ptr<const MountingCoordinator> &) override {}
  void schedulerShouldRenderTransactions(const std::shared_ptr<const MountingCoordinator> &coordinator) override
  {
    if (auto manager = manager_.lock()) {
      manager->scheduleTransaction(coordinator);
    }
  }
  void schedulerShouldMergeReactRevision(SurfaceId surfaceId) override
  {
    if (mergeReactRevision) {
      mergeReactRevision(surfaceId);
    }
  }
  void schedulerDidRequestPreliminaryViewAllocation(const ShadowNode &) override {}
  void schedulerDidDispatchCommand(const ShadowView &view, const std::string &name, const folly::dynamic &args) override
  {
    std::weak_ptr<OneLinuxMountingManager> weakManager = manager_;
    Tag tag = view.tag;
    OneLinuxDispatchMain([weakManager, tag, name, args] {
      if (auto manager = weakManager.lock()) {
        manager->dispatchCommand(tag, name, args);
      }
    });
  }
  void schedulerDidSendAccessibilityEvent(const ShadowView &, const std::string &) override {}
  void schedulerDidSetIsJSResponder(const ShadowView &, bool, bool) override {}
  void schedulerShouldSynchronouslyUpdateViewOnUIThread(Tag tag, const folly::dynamic &props) override
  {
    std::weak_ptr<OneLinuxMountingManager> weakManager = manager_;
    OneLinuxDispatchMain([weakManager, tag, props] {
      if (auto manager = weakManager.lock()) {
        manager->synchronouslyUpdateViewOnTag(tag, props);
      }
    });
  }
  // uimanager commits these props to the shadow tree itself, as on iOS
  void schedulerDidUpdateShadowTree(const std::unordered_map<Tag, folly::dynamic> &) override {}
  void schedulerDidCaptureViewSnapshot(Tag, SurfaceId) override {}
  void schedulerDidSetViewSnapshot(Tag, Tag, SurfaceId) override {}
  void schedulerDidClearPendingSnapshots() override {}

  std::function<void(SurfaceId)> mergeReactRevision;

 private:
  std::weak_ptr<OneLinuxMountingManager> manager_;
};

namespace {

std::string osVersion()
{
  utsname info;
  return uname(&info) == 0 ? info.release : "";
}

void firstFrame(GdkFrameClock *clock, gpointer)
{
  OneLinuxStartupMark("first frame with content painted");
  g_signal_handlers_disconnect_by_func(clock, reinterpret_cast<gpointer>(firstFrame), nullptr);
}

} // namespace

OneLinuxHost::OneLinuxHost(std::string bundlePath, std::string moduleName, OneView *surface)
    : bundlePath_(std::move(bundlePath)), moduleName_(std::move(moduleName)), surface_(surface)
{
  dark_ = prefersDark();
  GtkSettings *settings = gtk_settings_get_default();
  auto changed = [](GObject *, GParamSpec *, gpointer data) { static_cast<OneLinuxHost *>(data)->appearanceChanged(); };
  settingsHandlers_[0] = g_signal_connect(settings, "notify::gtk-application-prefer-dark-theme", G_CALLBACK(+changed), this);
  settingsHandlers_[1] = g_signal_connect(settings, "notify::gtk-theme-name", G_CALLBACK(+changed), this);
}

OneLinuxHost::~OneLinuxHost()
{
  GtkSettings *settings = gtk_settings_get_default();
  for (gulong handler : settingsHandlers_) {
    g_signal_handler_disconnect(settings, handler);
  }
  stop();
}

void OneLinuxHost::start()
{
  generation_++;
  guint generation = generation_;

  mountingManager_ = std::make_shared<OneLinuxMountingManager>();
  providerRegistry_ = OneLinuxMountingManager::componentDescriptorProviderRegistry();

  OneHostRuntimeOptions options;
  options.jsThread = std::make_shared<OneLinuxMessageQueueThread>();
  options.timerRegistry = std::make_unique<OneLinuxTimerRegistry>();
  options.createTurboModule = [](jsi::Runtime &runtime, const std::string &name, std::shared_ptr<CallInvoker> jsInvoker, const OneHostModuleContext &moduleContext)
      -> std::shared_ptr<TurboModule> {
    if (name == "ImageLoader") {
      return OneLinuxCreateImageLoaderModule(std::move(jsInvoker));
    }
    if (name == "LinkingManager") {
      return OneLinuxCreateLinkingModule(std::move(jsInvoker));
    }
    if (name == "OPSQLite") {
      return OneLinuxCreateOpSqliteModule(runtime, std::move(jsInvoker));
    }
    if (name == "NitroModules") {
      return OneLinuxCreateNitroModule(std::move(jsInvoker));
    }
    if (name == "WorkletsModule") {
      return OneLinuxCreateWorkletsModule(runtime, std::move(jsInvoker), moduleContext.isJavaScriptQueue);
    }
    if (name == "Networking") {
      return OneLinuxCreateNetworkingModule(std::move(jsInvoker), moduleContext);
    }
    if (name == "WebSocketModule") {
      return OneLinuxCreateWebSocketModule(std::move(jsInvoker), moduleContext);
    }
    return OneHostCreateTurboModule(name, std::move(jsInvoker), moduleContext);
  };
  options.hasComponentProvider = [](const std::string &name) { return OneLinuxMountingManager::hasComponentNamed(name); };
  options.logJsError = [](const std::string &message) { std::fprintf(stderr, "[one-linux] js error: %s\n", message.c_str()); };
  options.logJsMessage = [](const std::string &message, unsigned int level) {
    std::fprintf(stderr, "[one-linux] js log(%u): %s\n", level, message.c_str());
  };

  OneHostModuleContext &context = options.moduleContext;
  bool remote = bundlePath_.rfind("http://", 0) == 0 || bundlePath_.rfind("https://", 0) == 0;
  context.scriptURL = remote ? bundlePath_ : "file://" + bundlePath_;
  context.osVersion = osVersion();
  context.interfaceIdiom = "desktop";
  context.localeIdentifier = g_get_language_names()[0];
  context.windowMetrics = [this]() {
    std::lock_guard<std::mutex> lock(metricsMutex_);
    return OneHostWindowMetrics{width_, height_, scale_};
  };
  context.colorScheme = [this]() { return std::string(dark_ ? "dark" : "light"); };
  context.log = [](const std::string &line) { std::fprintf(stderr, "[one-linux] %s\n", line.c_str()); };
  context.reload = [this, generation]() {
    OneLinuxDispatchMain([this, generation] {
      if (generation_ == generation) {
        reload();
      }
    });
  };

  runtime_ = std::make_shared<OneHostRuntime>(std::move(options));
  mountingManager_->setContextContainer(runtime_->contextContainer());
  mountingManager_->didMount = [this, generation] {
    if (generation_ != generation) {
      return;
    }
    OneLinuxStartupMark("first transaction mounted");
    GdkFrameClock *clock = gtk_widget_get_frame_clock(GTK_WIDGET(surface_));
    g_signal_connect(clock, "after-paint", G_CALLBACK(firstFrame), nullptr);
  };

  schedulerDelegate_ = std::make_unique<SchedulerDelegate>(mountingManager_);
  std::weak_ptr<OneHostRuntime> weakRuntime = runtime_;
  schedulerDelegate_->mergeReactRevision = [weakRuntime](SurfaceId surfaceId) {
    if (auto runtime = weakRuntime.lock()) {
      runtime->mergeReactRevision(surfaceId, OneLinuxDispatchMain);
    }
  };

  auto manager = mountingManager_;
  runtime_->createScheduler(
      providerRegistry_,
      [manager](SharedComponentDescriptorRegistry descriptors) { manager->setComponentDescriptorRegistry(descriptors); },
      [](std::shared_ptr<EventBeat::OwnerBox> ownerBox, RuntimeScheduler &runtimeScheduler) -> std::unique_ptr<EventBeat> {
        auto observer = std::make_unique<const OneLinuxRunLoopObserver>(RunLoopObserver::Activity::BeforeWaiting, ownerBox->owner);
        return std::make_unique<AppleEventBeat>(std::move(ownerBox), std::move(observer), runtimeScheduler);
      },
      schedulerDelegate_.get());
  runtime_->initializeRuntime();
  OneLinuxStartupMark("runtime ready");

  {
    std::lock_guard<std::mutex> lock(metricsMutex_);
    runtime_->updateLayout(width_, height_, scale_);
  }
  OneView *surface = surface_;
  runtime_->startSurface(moduleName_, [manager, surface](SurfaceId surfaceId) { manager->attachSurface(surfaceId, surface); });
  manager->setSurfaceSize(runtime_->width(), runtime_->height());

  if (remote) {
    std::weak_ptr<OneHostRuntime> weakRuntime = runtime_;
    std::string url = bundlePath_;
    download_ = OneLinuxFetchScript(url, [this, generation, weakRuntime, url](const std::string &body, const std::string &error) {
      auto runtime = weakRuntime.lock();
      if (!runtime || generation_ != generation) {
        return;
      }
      if (!error.empty()) {
        std::fprintf(stderr, "[one-linux] could not load %s: %s\n", url.c_str(), error.c_str());
        return;
      }
      runtime->instance().loadScript(std::make_unique<JSBigStdString>(std::string(body)), url);
      OneLinuxStartupMark("downloaded bundle handed to the js thread");
    });
    return;
  }

  auto bundle = JSBigFileString::fromPath(bundlePath_);
  runtime_->instance().loadScript(std::move(bundle), "file://" + bundlePath_);
  OneLinuxStartupMark("bundle handed to the js thread");
}

void OneLinuxHost::stop()
{
  generation_++;
  if (download_) {
    g_cancellable_cancel(download_);
    g_clear_object(&download_);
  }
  if (runtime_) {
    auto manager = mountingManager_;
    runtime_->stopSurface([manager](SurfaceId surfaceId) { manager->detachSurface(surfaceId); });
    runtime_.reset();
  }
  // queued transactions hold the manager weakly; the delegate can go once the
  // runtime that called it is gone
  schedulerDelegate_.reset();
  mountingManager_.reset();
}

void OneLinuxHost::reload()
{
  stop();
  start();
}

// the dark preference or a theme named for a dark variant, such as Adwaita-dark
bool OneLinuxHost::prefersDark()
{
  GtkSettings *settings = gtk_settings_get_default();
  gboolean dark = FALSE;
  gchar *theme = nullptr;
  g_object_get(settings, "gtk-application-prefer-dark-theme", &dark, "gtk-theme-name", &theme, nullptr);
  if (theme) {
    gchar *lower = g_ascii_strdown(theme, -1);
    dark = dark || g_str_has_suffix(lower, "-dark") || g_str_has_suffix(lower, ":dark");
    g_free(lower);
    g_free(theme);
  }
  return dark;
}

void OneLinuxHost::appearanceChanged()
{
  bool dark = prefersDark();
  if (dark == dark_) {
    return;
  }
  dark_ = dark;
  if (runtime_) {
    runtime_->emitDeviceEvent("appearanceChanged", folly::dynamic::object("colorScheme", dark ? "dark" : "light"));
  }
}

void OneLinuxHost::updateLayout(double width, double height, double scale)
{
  {
    std::lock_guard<std::mutex> lock(metricsMutex_);
    width_ = width;
    height_ = height;
    scale_ = scale;
  }
  if (runtime_ && runtime_->updateLayout(width, height, scale)) {
    mountingManager_->setSurfaceSize(width, height);
    runtime_->emitDimensions();
  }
}

} // namespace facebook::react
