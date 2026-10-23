#import <os/log.h>
#import <AppKit/AppKit.h>

#include <chrono>

#include <folly/json.h>
#include <jsi/JSIDynamic.h>
#include <react/featureflags/ReactNativeFeatureFlags.h>
#include <react/nativemodule/dom/NativeDOM.h>
#include <react/nativemodule/idlecallbacks/NativeIdleCallbacks.h>

#include <CallInvokerDispatcher.hpp>
#include <InstallNitro.hpp>

#import "OneMacosModules.h"
#import "OneMacosOpSqlite.h"
#import "OneMacosWebSocket.h"
#import "OneMacosNetworking.h"
#import "OneMacosWorklets.h"

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
    name = OneMacosColorSchemeName(NSApp.effectiveAppearance);
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

// the window's content view is not covered by the title bar, so insets are zero
std::shared_ptr<OneMacosModule> safeAreaContext(
    std::shared_ptr<CallInvoker> invoker,
    const OneMacosModuleContext &context)
{
  auto module = std::make_shared<OneMacosModule>("OneNativeSafeAreaContext", std::move(invoker));
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

jsi::Value resolvedPromise(jsi::Runtime &rt, jsi::Value value)
{
  auto resolve = rt.global().getPropertyAsObject(rt, "Promise").getPropertyAsFunction(rt, "resolve");
  return resolve.call(rt, value);
}

// urls open in the default app through NSWorkspace; the app has no initial url
std::shared_ptr<OneMacosModule> linkingManager(std::shared_ptr<CallInvoker> invoker)
{
  auto module = std::make_shared<OneMacosModule>("LinkingManager", std::move(invoker));
  module->method("getInitialURL", 0, [](jsi::Runtime &rt, const jsi::Value *, size_t) {
    return resolvedPromise(rt, jsi::Value::null());
  });
  module->method("canOpenURL", 1, [](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
    NSURL *url = [NSURL URLWithString:@(stringArg(rt, args, count, 0).c_str())];
    return resolvedPromise(rt, jsi::Value(url != nil && [NSWorkspace.sharedWorkspace URLForApplicationToOpenURL:url] != nil));
  });
  module->method("openURL", 1, [](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
    NSURL *url = [NSURL URLWithString:@(stringArg(rt, args, count, 0).c_str())];
    bool opened = url != nil && [NSWorkspace.sharedWorkspace openURL:url];
    return resolvedPromise(rt, jsi::Value(opened));
  });
  module->method("openSettings", 0, [](jsi::Runtime &rt, const jsi::Value *, size_t) {
    NSURL *url = [NSURL URLWithString:@"x-apple.systempreferences:"];
    return resolvedPromise(rt, jsi::Value([NSWorkspace.sharedWorkspace openURL:url]));
  });
  module->noop("addListener");
  module->noop("removeListeners");
  return module;
}

std::shared_ptr<OneMacosModule> soundManager(std::shared_ptr<CallInvoker> invoker)
{
  auto module = std::make_shared<OneMacosModule>("SoundManager", std::move(invoker));
  module->noop("playTouchSound");
  return module;
}

std::shared_ptr<OneMacosModule> frameRateLogger(std::shared_ptr<CallInvoker> invoker)
{
  auto module = std::make_shared<OneMacosModule>("FrameRateLogger", std::move(invoker));
  module->noop("setGlobalOptions");
  module->noop("setContext");
  module->noop("beginScroll");
  module->noop("endScroll");
  return module;
}

// no software keyboard on a Mac, so nothing is ever emitted
std::shared_ptr<OneMacosModule> keyboardObserver(std::shared_ptr<CallInvoker> invoker)
{
  auto module = std::make_shared<OneMacosModule>("KeyboardObserver", std::move(invoker));
  module->noop("addListener");
  module->noop("removeListeners");
  return module;
}

// image loading is not provided on macOS yet, so every request rejects
std::shared_ptr<OneMacosModule> imageLoader(std::shared_ptr<CallInvoker> invoker)
{
  auto module = std::make_shared<OneMacosModule>("ImageLoader", std::move(invoker));
  for (const char *name : {"getSize", "getSizeWithHeaders", "prefetchImage", "prefetchImageWithMetadata", "queryCache"}) {
    module->method(name, 0, [name](jsi::Runtime &rt, const jsi::Value *, size_t) {
      auto reject = rt.global().getPropertyAsObject(rt, "Promise").getPropertyAsFunction(rt, "reject");
      return reject.call(rt, jsi::String::createFromUtf8(rt, std::string("ImageLoader.") + name + " is not available on macOS"));
    });
  }
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
      os_log(OS_LOG_DEFAULT, "[one-macos] js exception: " ONE_MACOS_JS_TEXT, folly::toJson(error).c_str());
    }
    return jsi::Value::undefined();
  });
  module->method("reportFatalException", 3, [](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
    os_log(OS_LOG_DEFAULT, "[one-macos] js fatal: " ONE_MACOS_JS_TEXT, stringArg(rt, args, count, 0).c_str());
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

// the global owns the store for exactly this runtime; module callbacks may also
// retain it until their in-flight work is cancelled during runtime teardown.
class OneMacosBlobStoreHolder : public jsi::HostObject {
 public:
  OneMacosBlobStore *store = [OneMacosBlobStore new];
};

class OneMacosBlobCollector : public jsi::HostObject {
 public:
  OneMacosBlobCollector(OneMacosBlobStore *store, NSString *identifier) : store_(store), identifier_(identifier) {}
  ~OneMacosBlobCollector() override { [store_ remove:identifier_]; }
 private:
  OneMacosBlobStore *store_;
  NSString *identifier_;
};

OneMacosBlobStore *runtimeBlobStore(jsi::Runtime &rt)
{
  constexpr const char *key = "__oneMacosBlobStore";
  auto value = rt.global().getProperty(rt, key);
  if (!value.isUndefined()) return value.getObject(rt).getHostObject<OneMacosBlobStoreHolder>(rt)->store;
  auto holder = std::make_shared<OneMacosBlobStoreHolder>();
  rt.global().setProperty(rt, key, jsi::Object::createFromHostObject(rt, holder));
  return holder->store;
}

id nativeJSON(jsi::Runtime &rt, const jsi::Value &value)
{
  auto json = folly::toJson(jsi::dynamicFromValue(rt, value));
  return [NSJSONSerialization JSONObjectWithData:[NSData dataWithBytes:json.data() length:json.size()]
                                      options:NSJSONReadingFragmentsAllowed error:nil];
}

std::shared_ptr<TurboModule> networking(jsi::Runtime &runtime, std::shared_ptr<CallInvoker> jsInvoker, const OneMacosModuleContext &context)
{
  auto module = std::make_shared<OneMacosModule>("Networking", std::move(jsInvoker));
  addEventEmitterStubs(*module);
  OneMacosNetworking *manager = [[OneMacosNetworking alloc] initWithEmitter:context.emitDeviceEvent blobStore:runtimeBlobStore(runtime)];
  module->method("sendRequest", 2, [manager](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
    if (count < 2) throw jsi::JSError(rt, "Networking.sendRequest requires a query and callback");
    NSDictionary *query = nativeJSON(rt, args[0]);
    NSInteger requestID = [manager nextRequestID];
    args[1].getObject(rt).getFunction(rt).call(rt, (double)requestID);
    [manager sendRequest:query requestID:requestID];
    return jsi::Value::undefined();
  });
  module->method("abortRequest", 1, [manager](jsi::Runtime &, const jsi::Value *args, size_t count) {
    [manager abortRequest:(NSInteger)numberArg(args, count, 0)];
    return jsi::Value::undefined();
  });
  module->method("clearCookies", 1, [manager](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
    BOOL cleared = [manager clearCookies];
    if (count) args[0].getObject(rt).getFunction(rt).call(rt, (bool)cleared);
    return jsi::Value::undefined();
  });
  return module;
}

std::shared_ptr<TurboModule> devLoadingView(std::shared_ptr<CallInvoker> jsInvoker)
{
  auto module = std::make_shared<OneMacosModule>("DevLoadingView", std::move(jsInvoker));
  module->noop("showMessage");
  module->noop("hide");
  return module;
}

std::shared_ptr<TurboModule> blobModule(jsi::Runtime &runtime, std::shared_ptr<CallInvoker> jsInvoker)
{
  auto module = std::make_shared<OneMacosModule>("BlobModule", std::move(jsInvoker));
  module->constants(folly::dynamic::object("BLOB_URI_SCHEME", "blob")("BLOB_URI_HOST", nullptr));
  module->noop("addNetworkingHandler");
  module->noop("addWebSocketHandler");
  module->noop("removeWebSocketHandler");
  OneMacosBlobStore *store = runtimeBlobStore(runtime);
  runtime.global().setProperty(runtime, "__blobCollectorProvider", jsi::Function::createFromHostFunction(
      runtime, jsi::PropNameID::forAscii(runtime, "__blobCollectorProvider"), 1,
      [store](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) -> jsi::Value {
        NSString *identifier = @(stringArg(rt, args, count, 0).c_str());
        return jsi::Object::createFromHostObject(rt, std::make_shared<OneMacosBlobCollector>(store, identifier));
      }));
  module->method("sendOverSocket", 2, [](jsi::Runtime &rt, const jsi::Value *, size_t) -> jsi::Value {
    throw jsi::JSError(rt, "Sending blobs over WebSocket is not supported by the macOS host");
  });
  module->method("createFromParts", 2, [store](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
    if (count < 2 || ![store createFromParts:nativeJSON(rt, args[0]) identifier:@(stringArg(rt, args, count, 1).c_str())]) {
      throw jsi::JSError(rt, "Unable to resolve blob parts");
    }
    return jsi::Value::undefined();
  });
  module->method("release", 1, [store](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
    [store remove:@(stringArg(rt, args, count, 0).c_str())];
    return jsi::Value::undefined();
  });
  return module;
}

std::shared_ptr<TurboModule> fileReaderModule(jsi::Runtime &runtime, std::shared_ptr<CallInvoker> jsInvoker)
{
  auto module = std::make_shared<OneMacosModule>("FileReaderModule", std::move(jsInvoker));
  OneMacosBlobStore *store = runtimeBlobStore(runtime);
  for (const auto &name : {"readAsText", "readAsDataURL"}) {
    bool asText = std::string(name) == "readAsText";
    module->method(name, asText ? 2 : 1, [store, asText](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
      NSDictionary *blob = count ? nativeJSON(rt, args[0]) : nil;
      NSData *bytes = [store resolve:blob];
      NSString *text = nil;
      if (bytes && asText) {
        NSString *charset = @(stringArg(rt, args, count, 1).c_str());
        CFStringEncoding encoding = charset.length ? CFStringConvertIANACharSetNameToEncoding((__bridge CFStringRef)charset) : kCFStringEncodingUTF8;
        if (encoding != kCFStringEncodingInvalidId) {
          text = [[NSString alloc] initWithData:bytes encoding:CFStringConvertEncodingToNSStringEncoding(encoding)];
        }
      } else if (bytes) {
        NSString *type = [blob[@"type"] isKindOfClass:NSString.class] && [blob[@"type"] length] ? blob[@"type"] : @"application/octet-stream";
        text = [NSString stringWithFormat:@"data:%@;base64,%@", type, [bytes base64EncodedStringWithOptions:0]];
      }
      auto promise = rt.global().getPropertyAsObject(rt, "Promise");
      if (!text) {
        auto error = rt.global().getPropertyAsFunction(rt, "Error").callAsConstructor(rt, "Unable to read blob data or encoding");
        return promise.getPropertyAsFunction(rt, "reject").callWithThis(rt, promise, error);
      }
      auto value = jsi::String::createFromUtf8(rt, std::string(text.UTF8String, [text lengthOfBytesUsingEncoding:NSUTF8StringEncoding]));
      return promise.getPropertyAsFunction(rt, "resolve").callWithThis(rt, promise, value);
    });
  }
  return module;
}

// native menu and key commands for this runtime, emitted as oneMacAppCommand
std::shared_ptr<TurboModule> appCommands(std::shared_ptr<CallInvoker> jsInvoker, const OneMacosModuleContext &context)
{
  auto module = std::make_shared<OneMacosModule>("OneMacAppCommands", std::move(jsInvoker));
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

// accessors answer undefined, so the JS flag getters keep their defaults,
// except the flags below: a mouse hovers through W3C pointer events here, since
// Pressability only wires onMouseEnter for web, and Animated runs on the C++
// animated renderer because the host has no classic native animated module
std::shared_ptr<TurboModule> featureFlags(std::shared_ptr<CallInvoker> jsInvoker)
{
  auto module = std::make_shared<OneMacosModule>("NativeReactNativeFeatureFlagsCxx", std::move(jsInvoker));
  module->wildcard = true;
  module->method("shouldPressibilityUseW3CPointerEventsForHover", 0, [](jsi::Runtime &, const jsi::Value *, size_t) {
    return jsi::Value(true);
  });
  module->method("cxxNativeAnimatedEnabled", 0, [](jsi::Runtime &, const jsi::Value *, size_t) {
    return jsi::Value(true);
  });
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
    jsi::Runtime &runtime,
    const std::string &name,
    std::shared_ptr<CallInvoker> jsInvoker,
    const OneMacosModuleContext &context)
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
  if (name == "Networking") {
    return networking(runtime, std::move(jsInvoker), context);
  }
  if (name == "DevLoadingView") {
    return devLoadingView(std::move(jsInvoker));
  }
  if (name == "BlobModule") {
    return blobModule(runtime, std::move(jsInvoker));
  }
  if (name == "FileReaderModule") {
    return fileReaderModule(runtime, std::move(jsInvoker));
  }
  if (name == "OneMacAppCommands") {
    return appCommands(std::move(jsInvoker), context);
  }
  if (name == "ReactDevToolsRuntimeSettingsModule") {
    return devToolsRuntimeSettings(std::move(jsInvoker));
  }
  if (name == "NativeReactNativeFeatureFlagsCxx") {
    return featureFlags(std::move(jsInvoker));
  }
  if (name == "NativeAnimatedModule") {
    return OneMacosCreateAnimatedModule(std::move(jsInvoker));
  }
  if (name == "NativeDOMCxx") {
    return std::make_shared<NativeDOM>(std::move(jsInvoker));
  }
  if (name == "NativeIdleCallbacksCxx") {
    return std::make_shared<NativeIdleCallbacks>(std::move(jsInvoker));
  }
  if (name == "NitroModules") {
    return nitro(std::move(jsInvoker));
  }
  if (name == "WorkletsModule") {
    return OneMacosCreateWorkletsModule(runtime, std::move(jsInvoker), context.isJavaScriptQueue);
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
  if (name == "OPSQLite") {
    return OneMacosCreateOpSqliteModule(runtime, std::move(jsInvoker));
  }
  if (name == "LinkingManager") {
    return linkingManager(std::move(jsInvoker));
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
  if (name == "ImageLoader") {
    return imageLoader(std::move(jsInvoker));
  }
  if (name == "OneNativeSafeAreaContext") {
    return safeAreaContext(std::move(jsInvoker), context);
  }
  return nullptr;
}

} // namespace facebook::react

NSString *OneMacosColorSchemeName(NSAppearance *appearance)
{
  NSAppearanceName match = [appearance bestMatchFromAppearancesWithNames:@[ NSAppearanceNameAqua, NSAppearanceNameDarkAqua ]];
  return [match isEqualToString:NSAppearanceNameDarkAqua] ? @"dark" : @"light";
}
