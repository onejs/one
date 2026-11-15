#pragma once

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/TurboModule.h>
#include <folly/dynamic.h>
#include <jsi/JSIDynamic.h>

#include <functional>
#include <memory>
#include <string>
#include <unordered_map>

namespace facebook::react {

struct OneHostWindowMetrics {
  double width{0};
  double height{0};
  double scale{1};
};

// What the TurboModules need from the host. Callbacks may run on any thread.
// OneHostRuntime fills emitDeviceEvent and isJavaScriptQueue; the platform
// fills the rest.
struct OneHostModuleContext {
  std::string scriptURL;
  // PlatformConstants osVersion and interfaceIdiom, I18nManager localeIdentifier
  std::string osVersion;
  std::string interfaceIdiom;
  std::string localeIdentifier;
  std::function<OneHostWindowMetrics()> windowMetrics;
  // "light" or "dark", the Appearance module's color scheme
  std::function<std::string()> colorScheme;
  // one line of host diagnostics, without a prefix
  std::function<void(const std::string &line)> log;
  // emits on RCTDeviceEventEmitter
  std::function<void(const std::string &eventName, folly::dynamic payload)> emitDeviceEvent;
  std::function<void()> reload;
  std::function<bool()> isJavaScriptQueue;
  // AppCommands.configure; returns an error for an invalid config
  std::function<std::string(const folly::dynamic &config)> configureAppCommands;
  // whether this runtime has an AppCommands listener
  std::function<void(bool listening)> setAppCommandsListening;
  // whether the host registers NativeAnimatedModule, so Animated runs on the
  // C++ animated renderer
  bool cxxNativeAnimated{false};
};

// A TurboModule made of host functions registered by name.
class OneHostModule : public TurboModule {
 public:
  using Method = std::function<jsi::Value(jsi::Runtime &, const jsi::Value *, size_t)>;

  OneHostModule(const std::string &name, std::shared_ptr<CallInvoker> jsInvoker)
      : TurboModule(name, std::move(jsInvoker)) {}

  // answers every unknown accessor with a no-op function, for modules whose JS
  // side only ever calls into them
  bool wildcard = false;
  void method(const std::string &name, size_t argCount, Method method)
  {
    hostMethods_[name] = {argCount, std::move(method)};
  }

  // methods that need no result and no arguments
  void noop(const std::string &name)
  {
    method(name, 0, [](jsi::Runtime &, const jsi::Value *, size_t) { return jsi::Value::undefined(); });
  }

  void constants(folly::dynamic value)
  {
    method("getConstants", 0, [value = std::move(value)](jsi::Runtime &rt, const jsi::Value *, size_t) {
      return jsi::valueFromDynamic(rt, value);
    });
  }

  jsi::Value create(jsi::Runtime &runtime, const jsi::PropNameID &propName) override
  {
    auto it = hostMethods_.find(propName.utf8(runtime));
    if (it == hostMethods_.end()) {
      if (wildcard) {
        return jsi::Function::createFromHostFunction(runtime, propName, 0, [](jsi::Runtime &, const jsi::Value &, const jsi::Value *, size_t) { return jsi::Value::undefined(); });
      }
      return jsi::Value::undefined();
    }
    auto &entry = it->second;
    return jsi::Function::createFromHostFunction(
        runtime,
        propName,
        static_cast<unsigned int>(entry.first),
        [method = entry.second](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
          return method(rt, args, count);
        });
  }

 private:
  std::unordered_map<std::string, std::pair<size_t, Method>> hostMethods_;
};

inline std::string stringArg(jsi::Runtime &rt, const jsi::Value *args, size_t count, size_t index)
{
  if (index < count && args[index].isString()) {
    return args[index].getString(rt).utf8(rt);
  }
  return {};
}

inline double numberArg(const jsi::Value *args, size_t count, size_t index)
{
  return index < count && args[index].isNumber() ? args[index].getNumber() : 0;
}

inline void addEventEmitterStubs(OneHostModule &module)
{
  module.noop("addListener");
  module.noop("removeListeners");
}

inline jsi::Value resolvedPromise(jsi::Runtime &rt, jsi::Value value)
{
  auto resolve = rt.global().getPropertyAsObject(rt, "Promise").getPropertyAsFunction(rt, "resolve");
  return resolve.call(rt, value);
}

} // namespace facebook::react
