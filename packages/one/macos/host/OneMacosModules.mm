#import <os/log.h>
#import <AppKit/AppKit.h>

#include <chrono>

#include <folly/json.h>
#include <jsi/JSIDynamic.h>

#include <CallInvokerDispatcher.hpp>
#include <InstallNitro.hpp>

#import "OneMacosModules.h"
#import "OneMacosOpSqlite.h"
#import "OneMacosWebSocket.h"
#import "OneMacosNetworking.h"
#import "OneMacosWorklets.h"

namespace facebook::react {

namespace {
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

// urls open in the default app through NSWorkspace; the app has no initial url
std::shared_ptr<OneHostModule> linkingManager(std::shared_ptr<CallInvoker> invoker)
{
  auto module = std::make_shared<OneHostModule>("LinkingManager", std::move(invoker));
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

// image loading is not provided on macOS yet, so every request rejects
std::shared_ptr<OneHostModule> imageLoader(std::shared_ptr<CallInvoker> invoker)
{
  auto module = std::make_shared<OneHostModule>("ImageLoader", std::move(invoker));
  for (const char *name : {"getSize", "getSizeWithHeaders", "prefetchImage", "prefetchImageWithMetadata", "queryCache"}) {
    module->method(name, 0, [name](jsi::Runtime &rt, const jsi::Value *, size_t) {
      auto reject = rt.global().getPropertyAsObject(rt, "Promise").getPropertyAsFunction(rt, "reject");
      return reject.call(rt, jsi::String::createFromUtf8(rt, std::string("ImageLoader.") + name + " is not available on macOS"));
    });
  }
  return module;
}

std::shared_ptr<OneHostModule> webSocket(std::shared_ptr<CallInvoker> invoker, const OneHostModuleContext &context)
{
  auto module = std::make_shared<OneHostModule>("WebSocketModule", std::move(invoker));
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

std::shared_ptr<TurboModule> networking(jsi::Runtime &runtime, std::shared_ptr<CallInvoker> jsInvoker, const OneHostModuleContext &context)
{
  auto module = std::make_shared<OneHostModule>("Networking", std::move(jsInvoker));
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

std::shared_ptr<TurboModule> blobModule(jsi::Runtime &runtime, std::shared_ptr<CallInvoker> jsInvoker)
{
  auto module = std::make_shared<OneHostModule>("BlobModule", std::move(jsInvoker));
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
  auto module = std::make_shared<OneHostModule>("FileReaderModule", std::move(jsInvoker));
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
std::shared_ptr<TurboModule> appCommands(std::shared_ptr<CallInvoker> jsInvoker, const OneHostModuleContext &context)
{
  auto module = std::make_shared<OneHostModule>("OneMacAppCommands", std::move(jsInvoker));
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

} // namespace

// installs global.NitroModulesProxy; no hybrid objects are registered here, so
// services that One's native build provides fail at createHybridObject
std::shared_ptr<TurboModule> nitro(std::shared_ptr<CallInvoker> jsInvoker)
{
  auto module = std::make_shared<OneHostModule>("NitroModules", jsInvoker);
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
    const OneHostModuleContext &context)
{
  if (name == "Networking") {
    return networking(runtime, std::move(jsInvoker), context);
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
  if (name == "NativeAnimatedModule") {
    return OneMacosCreateAnimatedModule(std::move(jsInvoker));
  }
  if (name == "NitroModules") {
    return nitro(std::move(jsInvoker));
  }
  if (name == "WorkletsModule") {
    return OneMacosCreateWorkletsModule(runtime, std::move(jsInvoker), context.isJavaScriptQueue);
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
  if (name == "ImageLoader") {
    return imageLoader(std::move(jsInvoker));
  }
  return OneHostCreateTurboModule(name, std::move(jsInvoker), context);
}

} // namespace facebook::react

NSString *OneMacosColorSchemeName(NSAppearance *appearance)
{
  NSAppearanceName match = [appearance bestMatchFromAppearancesWithNames:@[ NSAppearanceNameAqua, NSAppearanceNameDarkAqua ]];
  return [match isEqualToString:NSAppearanceNameDarkAqua] ? @"dark" : @"light";
}
