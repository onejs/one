#import <AppKit/AppKit.h>

#include <chrono>

#include <folly/json.h>
#include <jsi/JSIDynamic.h>
#include <react/featureflags/ReactNativeFeatureFlags.h>

#include <CallInvokerDispatcher.hpp>
#include <InstallNitro.hpp>

#import "OneMacosModules.h"
#import "OneMacosWebSocket.h"

namespace facebook::react {

namespace {

// React Native version the host links; reported through PlatformConstants
constexpr int kReactNativeMajor = 0;
constexpr int kReactNativeMinor = 88;
constexpr int kReactNativePatch = 0;

class OneMacosModule : public TurboModule {
 public:
  using Method = std::function<jsi::Value(jsi::Runtime &, const jsi::Value *, size_t)>;

  OneMacosModule(const std::string &name, std::shared_ptr<CallInvoker> jsInvoker)
      : TurboModule(name, std::move(jsInvoker)) {}

  bool wildcard = false; // TEMP survey
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
      if (wildcard) { // TEMP survey
        if (name_ != "NativeReactNativeFeatureFlagsCxx") NSLog(@"[one-macos] survey %s.%s", name_.c_str(), propName.utf8(runtime).c_str());
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

std::string stringArg(jsi::Runtime &rt, const jsi::Value *args, size_t count, size_t index)
{
  if (index < count && args[index].isString()) {
    return args[index].getString(rt).utf8(rt);
  }
  return {};
}

double numberArg(const jsi::Value *args, size_t count, size_t index)
{
  return index < count && args[index].isNumber() ? args[index].getNumber() : 0;
}

void addEventEmitterStubs(OneMacosModule &module)
{
  module.noop("addListener");
  module.noop("removeListeners");
}

folly::dynamic dimensions(const OneMacosWindowMetrics &metrics)
{
  folly::dynamic size = folly::dynamic::object("width", metrics.width)("height", metrics.height)(
      "scale", metrics.scale)("fontScale", 1);
  return folly::dynamic::object("window", size)("screen", size);
}

NSString *colorSchemeName()
{
  __block NSString *name = @"light";
  void (^read)(void) = ^{
    NSAppearanceName match = [NSApp.effectiveAppearance
        bestMatchFromAppearancesWithNames:@[ NSAppearanceNameAqua, NSAppearanceNameDarkAqua ]];
    name = [match isEqualToString:NSAppearanceNameDarkAqua] ? @"dark" : @"light";
  };
  if ([NSThread isMainThread]) {
    read();
  } else {
    dispatch_sync(dispatch_get_main_queue(), read);
  }
  return name;
}

std::shared_ptr<OneMacosModule> platformConstants(std::shared_ptr<CallInvoker> invoker)
{
  auto module = std::make_shared<OneMacosModule>("PlatformConstants", std::move(invoker));
  NSOperatingSystemVersion os = NSProcessInfo.processInfo.operatingSystemVersion;
  std::string osVersion = std::to_string(os.majorVersion) + "." + std::to_string(os.minorVersion) + "." +
      std::to_string(os.patchVersion);
  module->constants(folly::dynamic::object("isTesting", false)(
      "reactNativeVersion",
      folly::dynamic::object("major", kReactNativeMajor)("minor", kReactNativeMinor)("patch", kReactNativePatch))(
      "osVersion", osVersion)("interfaceIdiom", "mac")("forceTouchAvailable", false)("isDisableAnimations", false));
  return module;
}

std::shared_ptr<OneMacosModule> deviceInfo(
    std::shared_ptr<CallInvoker> invoker,
    const OneMacosModuleContext &context)
{
  auto module = std::make_shared<OneMacosModule>("DeviceInfo", std::move(invoker));
  module->method("getConstants", 0, [context](jsi::Runtime &rt, const jsi::Value *, size_t) {
    return jsi::valueFromDynamic(rt, folly::dynamic::object("Dimensions", dimensions(context.windowMetrics())));
  });
  return module;
}

std::shared_ptr<OneMacosModule> sourceCode(std::shared_ptr<CallInvoker> invoker, const OneMacosModuleContext &context)
{
  auto module = std::make_shared<OneMacosModule>("SourceCode", std::move(invoker));
  module->constants(folly::dynamic::object("scriptURL", context.scriptURL));
  return module;
}

std::shared_ptr<OneMacosModule> appearance(std::shared_ptr<CallInvoker> invoker)
{
  auto module = std::make_shared<OneMacosModule>("Appearance", std::move(invoker));
  module->method("getColorScheme", 0, [](jsi::Runtime &rt, const jsi::Value *, size_t) {
    return jsi::String::createFromUtf8(rt, colorSchemeName().UTF8String);
  });
  module->method("setColorScheme", 1, [](jsi::Runtime &, const jsi::Value *, size_t) {
    return jsi::Value::undefined();
  });
  addEventEmitterStubs(*module);
  return module;
}

std::shared_ptr<OneMacosModule> appState(std::shared_ptr<CallInvoker> invoker)
{
  auto module = std::make_shared<OneMacosModule>("AppState", std::move(invoker));
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

std::shared_ptr<OneMacosModule> i18nManager(std::shared_ptr<CallInvoker> invoker)
{
  auto module = std::make_shared<OneMacosModule>("I18nManager", std::move(invoker));
  module->constants(folly::dynamic::object("isRTL", false)("doLeftAndRightSwapInRTL", true)(
      "localeIdentifier", NSLocale.currentLocale.localeIdentifier.UTF8String));
  module->noop("allowRTL");
  module->noop("forceRTL");
  module->noop("swapLeftAndRightInRTL");
  return module;
}

std::shared_ptr<OneMacosModule> exceptionsManager(std::shared_ptr<CallInvoker> invoker)
{
  auto module = std::make_shared<OneMacosModule>("ExceptionsManager", std::move(invoker));
  module->method("reportException", 1, [](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
    if (count > 0 && args[0].isObject()) {
      folly::dynamic error = jsi::dynamicFromValue(rt, args[0]);
      NSLog(@"[one-macos] js exception: %s", folly::toJson(error).c_str());
    }
    return jsi::Value::undefined();
  });
  module->method("reportFatalException", 3, [](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
    NSLog(@"[one-macos] js fatal: %s", stringArg(rt, args, count, 0).c_str());
    return jsi::Value::undefined();
  });
  module->noop("dismissRedbox");
  module->noop("updateExceptionMessage");
  return module;
}

std::shared_ptr<OneMacosModule> logBox(std::shared_ptr<CallInvoker> invoker)
{
  auto module = std::make_shared<OneMacosModule>("LogBox", std::move(invoker));
  module->noop("show");
  module->noop("hide");
  return module;
}

std::shared_ptr<OneMacosModule> devSettings(std::shared_ptr<CallInvoker> invoker, const OneMacosModuleContext &context)
{
  auto module = std::make_shared<OneMacosModule>("DevSettings", std::move(invoker));
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

std::shared_ptr<OneMacosModule> webSocket(std::shared_ptr<CallInvoker> invoker, const OneMacosModuleContext &context)
{
  auto module = std::make_shared<OneMacosModule>("WebSocketModule", std::move(invoker));
  auto emit = context.emitDeviceEvent;
  OneMacosWebSocketManager *manager = [[OneMacosWebSocketManager alloc]
      initWithEmitter:[emit](const std::string &name, folly::dynamic payload) { emit(name, std::move(payload)); }];

  module->method("connect", 4, [manager](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
    NSURL *url = [NSURL URLWithString:@(stringArg(rt, args, count, 0).c_str())];
    NSMutableArray<NSString *> *protocols = [NSMutableArray new];
    if (count > 1 && args[1].isObject() && args[1].getObject(rt).isArray(rt)) {
      auto list = args[1].getObject(rt).getArray(rt);
      for (size_t i = 0; i < list.size(rt); i++) {
        [protocols addObject:@(list.getValueAtIndex(rt, i).getString(rt).utf8(rt).c_str())];
      }
    }
    [manager connect:url protocols:protocols socketID:(NSInteger)numberArg(args, count, 3)];
    return jsi::Value::undefined();
  });
  module->method("send", 2, [manager](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
    [manager sendText:@(stringArg(rt, args, count, 0).c_str()) socketID:(NSInteger)numberArg(args, count, 1)];
    return jsi::Value::undefined();
  });
  module->method("sendBinary", 2, [manager](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
    [manager sendBase64:@(stringArg(rt, args, count, 0).c_str()) socketID:(NSInteger)numberArg(args, count, 1)];
    return jsi::Value::undefined();
  });
  module->method("ping", 1, [manager](jsi::Runtime &, const jsi::Value *args, size_t count) {
    [manager ping:(NSInteger)numberArg(args, count, 0)];
    return jsi::Value::undefined();
  });
  module->method("close", 3, [manager](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
    [manager close:(NSInteger)numberArg(args, count, 2)
              code:(NSInteger)numberArg(args, count, 0)
            reason:@(stringArg(rt, args, count, 1).c_str())];
    return jsi::Value::undefined();
  });
  addEventEmitterStubs(*module);
  return module;
}

std::shared_ptr<TurboModule> performance(std::shared_ptr<CallInvoker> jsInvoker)
{
  auto module = std::make_shared<OneMacosModule>("NativePerformanceCxx", std::move(jsInvoker));
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
  auto module = std::make_shared<OneMacosModule>("NativeMicrotasksCxx", std::move(jsInvoker));
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
  auto module = std::make_shared<OneMacosModule>("SettingsManager", std::move(jsInvoker));
  module->constants(folly::dynamic::object("settings", folly::dynamic::object()));
  module->noop("setValues");
  module->noop("deleteValues");
  return module;
}

std::shared_ptr<TurboModule> networking(std::shared_ptr<CallInvoker> jsInvoker)
{
  auto module = std::make_shared<OneMacosModule>("Networking", std::move(jsInvoker));
  addEventEmitterStubs(*module);
  module->noop("sendRequest");
  module->noop("abortRequest");
  module->noop("clearCookies");
  return module;
}

std::shared_ptr<TurboModule> devLoadingView(std::shared_ptr<CallInvoker> jsInvoker)
{
  auto module = std::make_shared<OneMacosModule>("DevLoadingView", std::move(jsInvoker));
  module->noop("showMessage");
  module->noop("hide");
  return module;
}

std::shared_ptr<TurboModule> blobModule(std::shared_ptr<CallInvoker> jsInvoker)
{
  auto module = std::make_shared<OneMacosModule>("BlobModule", std::move(jsInvoker));
  module->constants(folly::dynamic::object("BLOB_URI_SCHEME", "blob")("BLOB_URI_HOST", nullptr));
  module->noop("addNetworkingHandler");
  module->noop("addWebSocketHandler");
  module->noop("removeWebSocketHandler");
  module->noop("sendOverSocket");
  module->noop("createFromParts");
  module->noop("release");
  return module;
}

std::shared_ptr<TurboModule> devToolsRuntimeSettings(std::shared_ptr<CallInvoker> jsInvoker)
{
  auto module = std::make_shared<OneMacosModule>("ReactDevToolsRuntimeSettingsModule", std::move(jsInvoker));
  module->method("getReloadAndProfileConfig", 0, [](jsi::Runtime &rt, const jsi::Value *, size_t) {
    return jsi::valueFromDynamic(
        rt, folly::dynamic::object("shouldReloadAndProfile", false)("recordChangeDescriptions", false));
  });
  module->noop("setReloadAndProfileConfig");
  return module;
}

// every accessor answers undefined, so the JS flag getters keep their defaults
std::shared_ptr<TurboModule> featureFlags(std::shared_ptr<CallInvoker> jsInvoker)
{
  auto module = std::make_shared<OneMacosModule>("NativeReactNativeFeatureFlagsCxx", std::move(jsInvoker));
  module->wildcard = true;
  return module;
}

} // namespace

// installs global.NitroModulesProxy; no hybrid objects are registered here, so
// services that One's native build provides fail at createHybridObject
std::shared_ptr<TurboModule> nitro(std::shared_ptr<CallInvoker> jsInvoker)
{
  auto module = std::make_shared<OneMacosModule>("NitroModules", jsInvoker);
  module->method("install", 0, [jsInvoker](jsi::Runtime &rt, const jsi::Value *, size_t) -> jsi::Value {
    try {
      margelo::nitro::install(rt, std::make_shared<margelo::nitro::CallInvokerDispatcher>(jsInvoker));
    } catch (const std::exception &error) {
      return jsi::String::createFromUtf8(rt, error.what());
    }
    return jsi::Value::null();
  });
  return module;
}

std::shared_ptr<TurboModule> OneMacosCreateTurboModule(
    const std::string &name,
    std::shared_ptr<CallInvoker> jsInvoker,
    const OneMacosModuleContext &context)
{
  NSLog(@"[one-macos] module requested: %s", name.c_str());
  if (name == "NativePerformanceCxx") {
    return performance(std::move(jsInvoker));
  }
  if (name == "NativeMicrotasksCxx") {
    return microtasks(std::move(jsInvoker));
  }
  if (name == "SettingsManager") {
    return settingsManager(std::move(jsInvoker));
  }
  if (name == "Networking") {
    return networking(std::move(jsInvoker));
  }
  if (name == "DevLoadingView") {
    return devLoadingView(std::move(jsInvoker));
  }
  if (name == "BlobModule") {
    return blobModule(std::move(jsInvoker));
  }
  if (name == "ReactDevToolsRuntimeSettingsModule") {
    return devToolsRuntimeSettings(std::move(jsInvoker));
  }
  if (name == "NativeReactNativeFeatureFlagsCxx") {
    return featureFlags(std::move(jsInvoker));
  }
  if (name == "NitroModules") {
    return nitro(std::move(jsInvoker));
  }
  if (name == "PlatformConstants") {
    return platformConstants(std::move(jsInvoker));
  }
  if (name == "DeviceInfo") {
    return deviceInfo(std::move(jsInvoker), context);
  }
  if (name == "SourceCode") {
    return sourceCode(std::move(jsInvoker), context);
  }
  if (name == "Appearance") {
    return appearance(std::move(jsInvoker));
  }
  if (name == "AppState") {
    return appState(std::move(jsInvoker));
  }
  if (name == "I18nManager") {
    return i18nManager(std::move(jsInvoker));
  }
  if (name == "ExceptionsManager") {
    return exceptionsManager(std::move(jsInvoker));
  }
  if (name == "LogBox") {
    return logBox(std::move(jsInvoker));
  }
  if (name == "DevSettings") {
    return devSettings(std::move(jsInvoker), context);
  }
  if (name == "WebSocketModule") {
    return webSocket(std::move(jsInvoker), context);
  }
  { // TEMP survey
    auto m = std::make_shared<OneMacosModule>(name, std::move(jsInvoker));
    m->wildcard = true;
    return m;
  }
  return nullptr;
}

} // namespace facebook::react
