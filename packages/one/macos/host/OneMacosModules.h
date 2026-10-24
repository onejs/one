#pragma once

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/TurboModule.h>
#include <folly/dynamic.h>

#include <functional>
#include <memory>
#include <string>

// format for js console text in the unified log: readable in Debug builds,
// redacted in Release so app logs never persist tokens or credentialed urls
#if DEBUG
#define ONE_MACOS_JS_TEXT "%{public}s"
#else
#define ONE_MACOS_JS_TEXT "%{private}s"
#endif

namespace facebook::react {

struct OneMacosWindowMetrics {
  double width{0};
  double height{0};
  double scale{1};
};

// What the TurboModules need from the host. Callbacks may run on any thread.
struct OneMacosModuleContext {
  std::string scriptURL;
  std::function<OneMacosWindowMetrics()> windowMetrics;
  // "light" or "dark", kept by the host on the main thread so js never waits for it
  std::function<const char *()> colorScheme;
  // emits on RCTDeviceEventEmitter
  std::function<void(const std::string &eventName, folly::dynamic payload)> emitDeviceEvent;
  std::function<void()> reload;
  std::function<bool()> isJavaScriptQueue;
  // AppCommands.configure; returns an error for an invalid config
  std::function<std::string(const folly::dynamic &config)> configureAppCommands;
  // whether this runtime has an AppCommands listener
  std::function<void(bool listening)> setAppCommandsListening;
};

// NativeAnimatedModule on RN's C++ animated renderer, frames from a display link
std::shared_ptr<TurboModule> OneMacosCreateAnimatedModule(std::shared_ptr<CallInvoker> jsInvoker);

// Returns nullptr for modules the host does not provide.
std::shared_ptr<TurboModule> OneMacosCreateTurboModule(
    jsi::Runtime &runtime,
    const std::string &name,
    std::shared_ptr<CallInvoker> jsInvoker,
    const OneMacosModuleContext &context);

} // namespace facebook::react

#ifdef __OBJC__
#import <AppKit/AppKit.h>

// "light" or "dark", the value of the Appearance module's color scheme
NSString *OneMacosColorSchemeName(NSAppearance *appearance);
#endif
