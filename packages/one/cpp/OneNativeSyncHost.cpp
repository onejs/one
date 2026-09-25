#include "OneNativeSyncHost.h"
#include "OneNativeSyncBridge.h"

#include <mutex>
#include <unordered_map>

#include <ReactCommon/CallInvoker.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

using namespace facebook;

namespace {

class OneNativeSyncStateHost;
void trackLiveHost(int32_t stateId, std::shared_ptr<OneNativeSyncStateHost> host);
void untrackLiveHost(int32_t stateId);

// one bound registry entry, reachable from any runtime holding it. the stored
// listener runs on its own runtime: directly when the writer is already there,
// via the UI scheduler or the JS invoker when it is not. a jsi::Function is
// only ever touched on its own runtime's thread.
class OneNativeSyncStateHost
    : public jsi::HostObject,
      public std::enable_shared_from_this<OneNativeSyncStateHost> {
 public:
  OneNativeSyncStateHost(
      int32_t stateId,
      jsi::Runtime &rnRuntime,
      std::shared_ptr<worklets::WorkletRuntime> uiRuntime,
      std::shared_ptr<react::CallInvoker> jsInvoker)
      : stateId_(stateId),
        rnRuntime_(rnRuntime),
        uiRuntime_(std::move(uiRuntime)),
        jsInvoker_(std::move(jsInvoker)) {}

  jsi::Value get(jsi::Runtime &runtime, const jsi::PropNameID &name) override {
    std::string prop = name.utf8(runtime);
    if (prop == "id") {
      return jsi::Value{stateId_};
    }
    if (prop == "get") {
      return jsi::Function::createFromHostFunction(
          runtime,
          name,
          0,
          [self = shared_from_this()](
              jsi::Runtime &rt,
              const jsi::Value &,
              const jsi::Value *,
              size_t) { return OneNativeSyncGet(rt, self->stateId_); });
    }
    if (prop == "set") {
      return jsi::Function::createFromHostFunction(
          runtime,
          name,
          1,
          [self = shared_from_this()](
              jsi::Runtime &rt,
              const jsi::Value &,
              const jsi::Value *args,
              size_t count) {
            if (count < 1) {
              throw jsi::JSError(rt, "OneNativeSyncState.set needs a value");
            }
            OneNativeSyncSet(rt, self->stateId_, args[0]);
            self->notifyChanged(rt);
            return jsi::Value::undefined();
          });
    }
    if (prop == "setOnChange") {
      return jsi::Function::createFromHostFunction(
          runtime,
          name,
          1,
          [self = shared_from_this()](
              jsi::Runtime &rt,
              const jsi::Value &,
              const jsi::Value *args,
              size_t count) {
            if (count < 1 || args[0].isNull() || args[0].isUndefined()) {
              self->onChange_.reset();
              return jsi::Value::undefined();
            }
            if (!args[0].isObject() || !args[0].asObject(rt).isFunction(rt)) {
              throw jsi::JSError(
                  rt, "OneNativeSyncState.onChange must be a function or null");
            }
            bool onUI = (&rt == &self->uiRuntime_->getJSIRuntime());
            self->onChange_ = Listener{
                &rt, args[0].asObject(rt).asFunction(rt), onUI};
            return jsi::Value::undefined();
          });
    }
    if (prop == "release") {
      return jsi::Function::createFromHostFunction(
          runtime,
          name,
          0,
          [self = shared_from_this()](
              jsi::Runtime &,
              const jsi::Value &,
              const jsi::Value *,
              size_t) {
            self->onChange_.reset();
            untrackLiveHost(self->stateId_);
            OneNativeSyncRelease(self->stateId_);
            return jsi::Value::undefined();
          });
    }
    return jsi::Value::undefined();
  }

  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt) override {
    std::vector<jsi::PropNameID> names;
    for (const char *name : {"id", "get", "set", "setOnChange", "release"}) {
      names.push_back(jsi::PropNameID::forAscii(rt, name));
    }
    return names;
  }

 private:
  struct Listener {
    jsi::Runtime *runtime;
    jsi::Function fn;
    bool onUI;
  };

  void notifyChanged(jsi::Runtime &caller) {
    if (!onChange_) {
      return;
    }
    if (&caller == onChange_->runtime) {
      onChange_->fn.call(caller, OneNativeSyncGet(caller, stateId_));
      return;
    }
    std::weak_ptr<OneNativeSyncStateHost> weak = weak_from_this();
    if (onChange_->onUI) {
      uiRuntime_->schedule([weak](jsi::Runtime &rt) {
        if (auto self = weak.lock()) {
          if (self->onChange_) {
            self->onChange_->fn.call(
                rt, OneNativeSyncGet(rt, self->stateId_));
          }
        }
      });
      return;
    }
    jsInvoker_->invokeAsync([weak]() {
      if (auto self = weak.lock()) {
        if (self->onChange_) {
          self->onChange_->fn.call(
              self->rnRuntime_,
              OneNativeSyncGet(self->rnRuntime_, self->stateId_));
        }
      }
    });
  }

  int32_t stateId_;
  jsi::Runtime &rnRuntime_;
  std::shared_ptr<worklets::WorkletRuntime> uiRuntime_;
  std::shared_ptr<react::CallInvoker> jsInvoker_;
  std::optional<Listener> onChange_;

 public:
  // external writes have no calling runtime, so the listener always hops to
  // its own runtime instead of running inline.
  void notifyExternal() {
    if (!onChange_) {
      return;
    }
    std::weak_ptr<OneNativeSyncStateHost> weak = weak_from_this();
    if (onChange_->onUI) {
      uiRuntime_->schedule([weak](jsi::Runtime &rt) {
        if (auto self = weak.lock()) {
          if (self->onChange_) {
            self->onChange_->fn.call(
                rt, OneNativeSyncGet(rt, self->stateId_));
          }
        }
      });
      return;
    }
    jsInvoker_->invokeAsync([weak]() {
      if (auto self = weak.lock()) {
        if (self->onChange_) {
          self->onChange_->fn.call(
              self->rnRuntime_,
              OneNativeSyncGet(self->rnRuntime_, self->stateId_));
        }
      }
    });
  }
};

// live handles by registry id, so writes that bypass every host object (user
// typing) still reach the JSI listener.
std::mutex liveHostsMutex;
std::unordered_map<int32_t, std::weak_ptr<OneNativeSyncStateHost>> liveHosts;

void trackLiveHost(int32_t stateId, std::shared_ptr<OneNativeSyncStateHost> host) {
  std::lock_guard<std::mutex> guard(liveHostsMutex);
  liveHosts[stateId] = std::move(host);
}

void untrackLiveHost(int32_t stateId) {
  std::lock_guard<std::mutex> guard(liveHostsMutex);
  liveHosts.erase(stateId);
}

} // namespace

void OneNativeSyncDidSetExternally(int32_t stateId) {
  std::shared_ptr<OneNativeSyncStateHost> host;
  {
    std::lock_guard<std::mutex> guard(liveHostsMutex);
    auto found = liveHosts.find(stateId);
    if (found != liveHosts.end()) {
      host = found->second.lock();
    }
  }
  if (host) {
    host->notifyExternal();
  }
}

void installOneNativeSyncState(
    jsi::Runtime &rnRuntime,
    std::shared_ptr<worklets::WorkletRuntime> uiRuntime,
    std::shared_ptr<react::CallInvoker> jsInvoker) {
  auto installOn = [&](jsi::Runtime &rt) {
    jsi::Object factory(rt);
    factory.setProperty(
        rt,
        "create",
        jsi::Function::createFromHostFunction(
            rt,
            jsi::PropNameID::forAscii(rt, "create"),
            1,
            [uiRuntime, jsInvoker, &rnRuntime](
                jsi::Runtime &rt,
                const jsi::Value &,
                const jsi::Value *args,
                size_t count) {
              if (count < 1) {
                throw jsi::JSError(
                    rt, "OneNativeSyncState.create needs an initial value");
              }
              int32_t stateId = OneNativeSyncCreate(rt, args[0]);
              auto host = std::make_shared<OneNativeSyncStateHost>(
                  stateId, rnRuntime, uiRuntime, jsInvoker);
              trackLiveHost(stateId, host);
              return jsi::Value(
                  rt, jsi::Object::createFromHostObject(rt, host));
            }));
    rt.global().setProperty(rt, "__OneNativeSyncState", std::move(factory));
  };
  installOn(rnRuntime);
  uiRuntime->runSync([&](jsi::Runtime &uiRt) { installOn(uiRt); });
}
