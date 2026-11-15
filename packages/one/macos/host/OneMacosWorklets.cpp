#include "OneMacosWorklets.h"

#include <dispatch/dispatch.h>
#include <pthread.h>

#include <worklets/NativeModules/WorkletsModuleProxyInitializer.h>
#include <worklets/Tools/JSScheduler.h>
#include <worklets/Tools/RNRuntimeStatus.h>
#include <worklets/Tools/UIScheduler.h>
#include <worklets/WorkletRuntime/RuntimeBindings.h>

#include <unordered_map>

namespace facebook::react {

namespace {

// this file is plain c++, so queue work through dispatch_async_f instead of blocks
void dispatchAsync(dispatch_queue_t queue, std::function<void()> job)
{
  dispatch_async_f(queue, new std::function<void()>(std::move(job)), [](void *context) {
    std::unique_ptr<std::function<void()>> job(static_cast<std::function<void()> *>(context));
    (*job)();
  });
}

class MainQueueUIScheduler : public worklets::UIScheduler,
                             public std::enable_shared_from_this<MainQueueUIScheduler> {
 public:
  void scheduleOnUI(std::function<void()> job) override
  {
    if (isOnUIThread()) {
      job();
      return;
    }

    UIScheduler::scheduleOnUI(job);

    if (!scheduledOnUI_) {
      dispatchAsync(dispatch_get_main_queue(), [weakThis = weak_from_this()] {
        if (auto strongThis = weakThis.lock()) {
          strongThis->triggerUI();
        }
      });
    }
  }

 protected:
  bool queryIsOnUIThread() const override
  {
    return pthread_main_np() != 0;
  }
};

jsi::Value nativeLog(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count)
{
  if (count != 2) {
    throw std::invalid_argument("nativeLoggingHook takes 2 arguments");
  }
  auto message = args[0].asString(rt).utf8(rt);
  fprintf(stderr, "[one-macos] worklets log(%u): %s\n", static_cast<unsigned>(args[1].asNumber()), message.c_str());
  return jsi::Value::undefined();
}

class WorkletsModule : public TurboModule {
 public:
  WorkletsModule(jsi::Runtime &runtime, std::shared_ptr<CallInvoker> jsInvoker, std::function<bool()> isJavaScriptQueue)
      : TurboModule("WorkletsModule", jsInvoker), runtime_(runtime)
  {
    auto jsScheduler = std::make_shared<worklets::JSScheduler>(runtime, jsInvoker, std::move(isJavaScriptQueue));
    auto uiScheduler = std::make_shared<MainQueueUIScheduler>();
    rnRuntimeStatus_ = std::make_shared<worklets::RNRuntimeStatus>();
    auto bindings = std::make_shared<worklets::RuntimeBindings>(worklets::RuntimeBindings{
        .requestAnimationFrame = [](std::function<void(const double)> callback) { OneMacosRequestAnimationFrame(std::move(callback)); },
        .nativeLoggingHook = nativeLog,
        .networkingBackend = OneMacosMakeWorkletsNetworkingBackend()});
    initializer_ =
        std::make_shared<worklets::WorkletsModuleProxyInitializer>(jsScheduler, uiScheduler, bindings, rnRuntimeStatus_);

    auto initializer = initializer_;
    dispatchAsync(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), [initializer] { initializer->prepareProxy(); });
  }

  ~WorkletsModule() override
  {
    OneMacosInvalidateAnimationFrames();
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

std::shared_ptr<TurboModule> OneMacosCreateWorkletsModule(
    jsi::Runtime &runtime,
    std::shared_ptr<CallInvoker> jsInvoker,
    std::function<bool()> isJavaScriptQueue)
{
  return std::make_shared<WorkletsModule>(runtime, std::move(jsInvoker), std::move(isJavaScriptQueue));
}

} // namespace facebook::react
