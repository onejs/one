#include "OneLinuxWorklets.h"

#include <glib.h>

#include <worklets/Networking/NetworkingBackend.h>
#include <worklets/NativeModules/WorkletsModuleProxyInitializer.h>
#include <worklets/Tools/JSScheduler.h>
#include <worklets/Tools/PlatformLogger.h>
#include <worklets/Tools/RNRuntimeStatus.h>
#include <worklets/Tools/UIScheduler.h>
#include <worklets/WorkletRuntime/RuntimeBindings.h>

#include <cstdio>
#include <mutex>
#include <thread>
#include <vector>

namespace worklets {

void PlatformLogger::log(const char *str) { std::fprintf(stderr, "[one-linux] worklets: %s\n", str); }
void PlatformLogger::log(const std::string &str) { log(str.c_str()); }
void PlatformLogger::log(const double d) { std::fprintf(stderr, "[one-linux] worklets: %lf\n", d); }
void PlatformLogger::log(const int i) { std::fprintf(stderr, "[one-linux] worklets: %i\n", i); }
void PlatformLogger::log(const bool b) { log(b ? "true" : "false"); }

} // namespace worklets

namespace facebook::react {

namespace {

void runOnMainContext(std::function<void()> job)
{
  g_idle_add_full(
      G_PRIORITY_DEFAULT,
      [](gpointer data) -> gboolean {
        (*static_cast<std::function<void()> *>(data))();
        return G_SOURCE_REMOVE;
      },
      new std::function<void()>(std::move(job)),
      [](gpointer data) { delete static_cast<std::function<void()> *>(data); });
}

class MainContextUIScheduler : public worklets::UIScheduler,
                               public std::enable_shared_from_this<MainContextUIScheduler> {
 public:
  void scheduleOnUI(std::function<void()> job) override
  {
    if (isOnUIThread()) {
      job();
      return;
    }

    UIScheduler::scheduleOnUI(job);

    if (!scheduledOnUI_) {
      runOnMainContext([weakThis = weak_from_this()] {
        if (auto strongThis = weakThis.lock()) {
          strongThis->triggerUI();
        }
      });
    }
  }

 protected:
  bool queryIsOnUIThread() const override
  {
    return g_main_context_is_owner(g_main_context_default());
  }
};

// requestAnimationFrame for worklet runtimes: a 60 Hz timeout on the main
// context that runs only while callbacks are pending
class AnimationFrames {
 public:
  static AnimationFrames &shared()
  {
    static AnimationFrames frames;
    return frames;
  }

  void request(std::function<void(double)> callback)
  {
    {
      std::lock_guard<std::mutex> lock(mutex_);
      callbacks_.push_back(std::move(callback));
      if (armed_) {
        return;
      }
      armed_ = true;
    }
    runOnMainContext([this] {
      std::lock_guard<std::mutex> lock(mutex_);
      source_ = g_timeout_add(16, [](gpointer) -> gboolean { return shared().frame(); }, nullptr);
    });
  }

  void invalidate()
  {
    std::lock_guard<std::mutex> lock(mutex_);
    callbacks_.clear();
  }

 private:
  gboolean frame()
  {
    std::vector<std::function<void(double)>> callbacks;
    {
      std::lock_guard<std::mutex> lock(mutex_);
      callbacks = std::move(callbacks_);
      callbacks_.clear();
      armed_ = false;
      source_ = 0;
    }
    double timestamp = static_cast<double>(g_get_monotonic_time()) / 1000.0;
    for (auto &callback : callbacks) {
      callback(timestamp);
    }
    return G_SOURCE_REMOVE;
  }

  std::mutex mutex_;
  std::vector<std::function<void(double)>> callbacks_;
  bool armed_{false};
  guint source_{0};
};

// worklet runtimes have no network on Linux yet; every request fails
class UnavailableNetworkingBackend : public worklets::NetworkingBackend {
 public:
  void sendRequest(uint64_t, worklets::RequestConfig &&, const std::shared_ptr<worklets::NetworkRequestListener> &listener) override
  {
    listener->onError(worklets::RequestError::Network, "networking is not available on Linux yet");
  }
  void abortRequest(uint64_t) override {}
};

jsi::Value nativeLog(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count)
{
  if (count != 2) {
    throw std::invalid_argument("nativeLoggingHook takes 2 arguments");
  }
  auto message = args[0].asString(rt).utf8(rt);
  std::fprintf(stderr, "[one-linux] worklets log(%u): %s\n", static_cast<unsigned>(args[1].asNumber()), message.c_str());
  return jsi::Value::undefined();
}

class WorkletsModule : public TurboModule {
 public:
  WorkletsModule(jsi::Runtime &runtime, std::shared_ptr<CallInvoker> jsInvoker, std::function<bool()> isJavaScriptQueue)
      : TurboModule("WorkletsModule", jsInvoker), runtime_(runtime)
  {
    auto jsScheduler = std::make_shared<worklets::JSScheduler>(runtime, jsInvoker, std::move(isJavaScriptQueue));
    auto uiScheduler = std::make_shared<MainContextUIScheduler>();
    rnRuntimeStatus_ = std::make_shared<worklets::RNRuntimeStatus>();
    auto bindings = std::make_shared<worklets::RuntimeBindings>(worklets::RuntimeBindings{
        .requestAnimationFrame = [](std::function<void(const double)> callback) { AnimationFrames::shared().request(std::move(callback)); },
        .nativeLoggingHook = nativeLog,
        .networkingBackend = std::make_shared<UnavailableNetworkingBackend>()});
    initializer_ =
        std::make_shared<worklets::WorkletsModuleProxyInitializer>(jsScheduler, uiScheduler, bindings, rnRuntimeStatus_);

    auto initializer = initializer_;
    std::thread([initializer] { initializer->prepareProxy(); }).detach();
  }

  ~WorkletsModule() override
  {
    AnimationFrames::shared().invalidate();
    rnRuntimeStatus_->setDead();
    initializer_->invalidate();
  }

  jsi::Value create(jsi::Runtime &rt, const jsi::PropNameID &propName) override
  {
    auto name = propName.utf8(rt);
    if (name == "installTurboModule") {
      return method(rt, propName, 1, [this](jsi::Runtime &, const jsi::Value *args, size_t count) {
        bool bundleMode = count > 0 && args[0].isBool() && args[0].getBool();
        proxy_ = initializer_->finalize(runtime_, bundleMode, [] { return worklets::BundleModeConfig{}; });
        return jsi::Value(true);
      });
    }
    if (name == "start") {
      return method(rt, propName, 0, [this](jsi::Runtime &, const jsi::Value *, size_t) {
        proxy_->start();
        return jsi::Value(true);
      });
    }
    if (name == "prepareBundleMode") {
      return method(rt, propName, 0, [](jsi::Runtime &, const jsi::Value *, size_t) { return jsi::Value(true); });
    }
    return jsi::Value::undefined();
  }

 private:
  template <typename Fn>
  static jsi::Value method(jsi::Runtime &rt, const jsi::PropNameID &name, unsigned argCount, Fn fn)
  {
    return jsi::Function::createFromHostFunction(
        rt, name, argCount, [fn](jsi::Runtime &r, const jsi::Value &, const jsi::Value *args, size_t count) {
          return fn(r, args, count);
        });
  }

  jsi::Runtime &runtime_;
  std::shared_ptr<worklets::RNRuntimeStatus> rnRuntimeStatus_;
  std::shared_ptr<worklets::WorkletsModuleProxyInitializer> initializer_;
  std::shared_ptr<worklets::WorkletsModuleProxy> proxy_;
};

} // namespace

std::shared_ptr<TurboModule> OneLinuxCreateWorkletsModule(
    jsi::Runtime &runtime,
    std::shared_ptr<CallInvoker> jsInvoker,
    std::function<bool()> isJavaScriptQueue)
{
  return std::make_shared<WorkletsModule>(runtime, std::move(jsInvoker), std::move(isJavaScriptQueue));
}

} // namespace facebook::react
