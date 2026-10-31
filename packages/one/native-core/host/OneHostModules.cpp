#include "OneHostModules.h"

#include <chrono>

#include <folly/json.h>
#include <react/featureflags/ReactNativeFeatureFlags.h>
#include <react/nativemodule/dom/NativeDOM.h>
#include <react/nativemodule/idlecallbacks/NativeIdleCallbacks.h>

namespace facebook::react {

namespace {

// React Native version the host links; reported through PlatformConstants
constexpr int kReactNativeMajor = 0;
constexpr int kReactNativeMinor = 88;
constexpr int kReactNativePatch = 0;

folly::dynamic dimensions(const OneHostWindowMetrics &metrics)
{
  folly::dynamic size = folly::dynamic::object("width", metrics.width)("height", metrics.height)(
      "scale", metrics.scale)("fontScale", 1);
  return folly::dynamic::object("window", size)("screen", size);
}

std::shared_ptr<OneHostModule> platformConstants(
    std::shared_ptr<CallInvoker> invoker,
    const OneHostModuleContext &context)
{
  auto module = std::make_shared<OneHostModule>("PlatformConstants", std::move(invoker));
  module->constants(folly::dynamic::object("isTesting", false)(
      "reactNativeVersion",
      folly::dynamic::object("major", kReactNativeMajor)("minor", kReactNativeMinor)("patch", kReactNativePatch))(
      "osVersion", context.osVersion)("interfaceIdiom", context.interfaceIdiom)("forceTouchAvailable", false)(
      "isDisableAnimations", false));
  return module;
}

std::shared_ptr<OneHostModule> deviceInfo(
    std::shared_ptr<CallInvoker> invoker,
    const OneHostModuleContext &context)
{
  auto module = std::make_shared<OneHostModule>("DeviceInfo", std::move(invoker));
  module->method("getConstants", 0, [context](jsi::Runtime &rt, const jsi::Value *, size_t) {
    return jsi::valueFromDynamic(rt, folly::dynamic::object("Dimensions", dimensions(context.windowMetrics())));
  });
  return module;
}

// the window's content view is not covered by the title bar, so insets are zero
std::shared_ptr<OneHostModule> safeAreaContext(
    std::shared_ptr<CallInvoker> invoker,
    const OneHostModuleContext &context)
{
  auto module = std::make_shared<OneHostModule>("OneNativeSafeAreaContext", std::move(invoker));
  module->method("getConstants", 0, [context](jsi::Runtime &rt, const jsi::Value *, size_t) {
    auto metrics = context.windowMetrics();
    return jsi::valueFromDynamic(
        rt,
        folly::dynamic::object(
            "initialWindowMetrics",
            folly::dynamic::object(
                "insets", folly::dynamic::object("top", 0)("right", 0)("bottom", 0)("left", 0))(
                "frame",
                folly::dynamic::object("x", 0)("y", 0)("width", metrics.width)("height", metrics.height))));
  });
  return module;
}

std::shared_ptr<OneHostModule> soundManager(std::shared_ptr<CallInvoker> invoker)
{
  auto module = std::make_shared<OneHostModule>("SoundManager", std::move(invoker));
  module->noop("playTouchSound");
  return module;
}

std::shared_ptr<OneHostModule> frameRateLogger(std::shared_ptr<CallInvoker> invoker)
{
  auto module = std::make_shared<OneHostModule>("FrameRateLogger", std::move(invoker));
  module->noop("setGlobalOptions");
  module->noop("setContext");
  module->noop("beginScroll");
  module->noop("endScroll");
  return module;
}

// no software keyboard on a desktop, so nothing is ever emitted
std::shared_ptr<OneHostModule> keyboardObserver(std::shared_ptr<CallInvoker> invoker)
{
  auto module = std::make_shared<OneHostModule>("KeyboardObserver", std::move(invoker));
  module->noop("addListener");
  module->noop("removeListeners");
  return module;
}

std::shared_ptr<OneHostModule> sourceCode(std::shared_ptr<CallInvoker> invoker, const OneHostModuleContext &context)
{
  auto module = std::make_shared<OneHostModule>("SourceCode", std::move(invoker));
  module->constants(folly::dynamic::object("scriptURL", context.scriptURL));
  return module;
}

std::shared_ptr<OneHostModule> appearance(std::shared_ptr<CallInvoker> invoker, const OneHostModuleContext &context)
{
  auto module = std::make_shared<OneHostModule>("Appearance", std::move(invoker));
  module->method("getColorScheme", 0, [context](jsi::Runtime &rt, const jsi::Value *, size_t) {
    return jsi::String::createFromUtf8(rt, context.colorScheme());
  });
  module->method("setColorScheme", 1, [](jsi::Runtime &, const jsi::Value *, size_t) {
    return jsi::Value::undefined();
  });
  addEventEmitterStubs(*module);
  return module;
}

std::shared_ptr<OneHostModule> appState(std::shared_ptr<CallInvoker> invoker)
{
  auto module = std::make_shared<OneHostModule>("AppState", std::move(invoker));
  module->constants(folly::dynamic::object("initialAppState", "active"));
  module->method("getCurrentAppState", 2, [](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
    if (count > 0 && args[0].isObject()) {
      auto state = jsi::Object(rt);
      state.setProperty(rt, "app_state", jsi::String::createFromUtf8(rt, "active"));
      args[0].getObject(rt).asFunction(rt).call(rt, state);
    }
    return jsi::Value::undefined();
  });
  addEventEmitterStubs(*module);
  return module;
}

std::shared_ptr<OneHostModule> i18nManager(std::shared_ptr<CallInvoker> invoker, const OneHostModuleContext &context)
{
  auto module = std::make_shared<OneHostModule>("I18nManager", std::move(invoker));
  module->constants(folly::dynamic::object("isRTL", false)("doLeftAndRightSwapInRTL", true)(
      "localeIdentifier", context.localeIdentifier));
  module->noop("allowRTL");
  module->noop("forceRTL");
  module->noop("swapLeftAndRightInRTL");
  return module;
}

std::shared_ptr<OneHostModule> exceptionsManager(std::shared_ptr<CallInvoker> invoker, const OneHostModuleContext &context)
{
  auto module = std::make_shared<OneHostModule>("ExceptionsManager", std::move(invoker));
  module->method("reportException", 1, [context](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
    if (count > 0 && args[0].isObject()) {
      folly::dynamic error = jsi::dynamicFromValue(rt, args[0]);
      context.log("js exception: " + folly::toJson(error));
    }
    return jsi::Value::undefined();
  });
  module->method("reportFatalException", 3, [context](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
    context.log("js fatal: " + stringArg(rt, args, count, 0));
    return jsi::Value::undefined();
  });
  module->noop("dismissRedbox");
  module->noop("updateExceptionMessage");
  return module;
}

std::shared_ptr<OneHostModule> logBox(std::shared_ptr<CallInvoker> invoker)
{
  auto module = std::make_shared<OneHostModule>("LogBox", std::move(invoker));
  module->noop("show");
  module->noop("hide");
  return module;
}

std::shared_ptr<OneHostModule> devSettings(std::shared_ptr<CallInvoker> invoker, const OneHostModuleContext &context)
{
  auto module = std::make_shared<OneHostModule>("DevSettings", std::move(invoker));
  module->method("reload", 0, [context](jsi::Runtime &, const jsi::Value *, size_t) {
    context.reload();
    return jsi::Value::undefined();
  });
  module->method("reloadWithReason", 1, [context](jsi::Runtime &, const jsi::Value *, size_t) {
    context.reload();
    return jsi::Value::undefined();
  });
  module->noop("onFastRefresh");
  module->noop("setHotLoadingEnabled");
  module->noop("setIsDebuggingRemotely");
  module->noop("setProfilingEnabled");
  module->noop("toggleElementInspector");
  module->noop("addMenuItem");
  module->noop("openDebugger");
  addEventEmitterStubs(*module);
  return module;
}

std::shared_ptr<TurboModule> performance(std::shared_ptr<CallInvoker> jsInvoker)
{
  auto module = std::make_shared<OneHostModule>("NativePerformanceCxx", std::move(jsInvoker));
  module->method("now", 0, [](jsi::Runtime &, const jsi::Value *, size_t) {
    auto elapsed = std::chrono::steady_clock::now().time_since_epoch();
    return jsi::Value(std::chrono::duration<double, std::milli>(elapsed).count());
  });
  module->noop("reportMark");
  module->noop("reportMeasure");
  module->noop("clearMarks");
  module->noop("clearMeasures");
  return module;
}

std::shared_ptr<TurboModule> microtasks(std::shared_ptr<CallInvoker> jsInvoker)
{
  auto module = std::make_shared<OneHostModule>("NativeMicrotasksCxx", std::move(jsInvoker));
  module->method("queueMicrotask", 1, [](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
    if (count > 0 && args[0].isObject() && args[0].getObject(rt).isFunction(rt)) {
      rt.queueMicrotask(args[0].getObject(rt).getFunction(rt));
    }
    return jsi::Value::undefined();
  });
  return module;
}

std::shared_ptr<TurboModule> settingsManager(std::shared_ptr<CallInvoker> jsInvoker)
{
  auto module = std::make_shared<OneHostModule>("SettingsManager", std::move(jsInvoker));
  module->constants(folly::dynamic::object("settings", folly::dynamic::object()));
  module->noop("setValues");
  module->noop("deleteValues");
  return module;
}

std::shared_ptr<TurboModule> devLoadingView(std::shared_ptr<CallInvoker> jsInvoker)
{
  auto module = std::make_shared<OneHostModule>("DevLoadingView", std::move(jsInvoker));
  module->noop("showMessage");
  module->noop("hide");
  return module;
}

std::shared_ptr<TurboModule> devToolsRuntimeSettings(std::shared_ptr<CallInvoker> jsInvoker)
{
  auto module = std::make_shared<OneHostModule>("ReactDevToolsRuntimeSettingsModule", std::move(jsInvoker));
  module->method("getReloadAndProfileConfig", 0, [](jsi::Runtime &rt, const jsi::Value *, size_t) {
    return jsi::valueFromDynamic(
        rt, folly::dynamic::object("shouldReloadAndProfile", false)("recordChangeDescriptions", false));
  });
  module->noop("setReloadAndProfileConfig");
  return module;
}

// accessors answer undefined, so the JS flag getters keep their defaults,
// except the flags below: a mouse hovers through W3C pointer events here, since
// Pressability only wires onMouseEnter for web, and Animated runs on the C++
// animated renderer when the host registers a NativeAnimatedModule
std::shared_ptr<TurboModule> featureFlags(std::shared_ptr<CallInvoker> jsInvoker, const OneHostModuleContext &context)
{
  auto module = std::make_shared<OneHostModule>("NativeReactNativeFeatureFlagsCxx", std::move(jsInvoker));
  module->wildcard = true;
  module->method("shouldPressibilityUseW3CPointerEventsForHover", 0, [](jsi::Runtime &, const jsi::Value *, size_t) {
    return jsi::Value(true);
  });
  bool cxxNativeAnimated = context.cxxNativeAnimated;
  module->method("cxxNativeAnimatedEnabled", 0, [cxxNativeAnimated](jsi::Runtime &, const jsi::Value *, size_t) {
    return jsi::Value(cxxNativeAnimated);
  });
  return module;
}

} // namespace

// menu validation and listener state are shared by desktop command modules.
std::shared_ptr<TurboModule> OneHostCreateAppCommandsModule(const std::string &name, std::shared_ptr<CallInvoker> jsInvoker, const OneHostModuleContext &context)
{
  auto module = std::make_shared<OneHostModule>(name, std::move(jsInvoker));
  module->method("configure", 1, [context](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
    auto error = context.configureAppCommands(count > 0 ? jsi::dynamicFromValue(rt, args[0]) : folly::dynamic());
    if (!error.empty()) {
      throw jsi::JSError(rt, "AppCommands.configure: " + error);
    }
    return jsi::Value::undefined();
  });
  module->method("setListening", 1, [context](jsi::Runtime &, const jsi::Value *args, size_t count) {
    context.setAppCommandsListening(count > 0 && args[0].isBool() && args[0].getBool());
    return jsi::Value::undefined();
  });
  return module;
}

std::shared_ptr<TurboModule> OneHostCreateTurboModule(
    const std::string &name,
    std::shared_ptr<CallInvoker> jsInvoker,
    const OneHostModuleContext &context)
{
  if (name == "NativePerformanceCxx") {
    return performance(std::move(jsInvoker));
  }
  if (name == "NativeMicrotasksCxx") {
    return microtasks(std::move(jsInvoker));
  }
  if (name == "SettingsManager") {
    return settingsManager(std::move(jsInvoker));
  }
  if (name == "DevLoadingView") {
    return devLoadingView(std::move(jsInvoker));
  }
  if (name == "ReactDevToolsRuntimeSettingsModule") {
    return devToolsRuntimeSettings(std::move(jsInvoker));
  }
  if (name == "NativeReactNativeFeatureFlagsCxx") {
    return featureFlags(std::move(jsInvoker), context);
  }
  if (name == "NativeDOMCxx") {
    return std::make_shared<NativeDOM>(std::move(jsInvoker));
  }
  if (name == "NativeIdleCallbacksCxx") {
    return std::make_shared<NativeIdleCallbacks>(std::move(jsInvoker));
  }
  if (name == "PlatformConstants") {
    return platformConstants(std::move(jsInvoker), context);
  }
  if (name == "DeviceInfo") {
    return deviceInfo(std::move(jsInvoker), context);
  }
  if (name == "SourceCode") {
    return sourceCode(std::move(jsInvoker), context);
  }
  if (name == "Appearance") {
    return appearance(std::move(jsInvoker), context);
  }
  if (name == "AppState") {
    return appState(std::move(jsInvoker));
  }
  if (name == "I18nManager") {
    return i18nManager(std::move(jsInvoker), context);
  }
  if (name == "ExceptionsManager") {
    return exceptionsManager(std::move(jsInvoker), context);
  }
  if (name == "LogBox") {
    return logBox(std::move(jsInvoker));
  }
  if (name == "DevSettings") {
    return devSettings(std::move(jsInvoker), context);
  }
  if (name == "SoundManager") {
    return soundManager(std::move(jsInvoker));
  }
  if (name == "FrameRateLogger") {
    return frameRateLogger(std::move(jsInvoker));
  }
  if (name == "KeyboardObserver") {
    return keyboardObserver(std::move(jsInvoker));
  }
  if (name == "OneNativeSafeAreaContext") {
    return safeAreaContext(std::move(jsInvoker), context);
  }
  return nullptr;
}

} // namespace facebook::react
