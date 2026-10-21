#pragma once

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/TurboModule.h>
#include <folly/dynamic.h>

#include <functional>
#include <memory>
#include <string>

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
  // emits on RCTDeviceEventEmitter
  std::function<void(const std::string &eventName, folly::dynamic payload)> emitDeviceEvent;
  std::function<void()> reload;
  std::function<bool()> isJavaScriptQueue;
};

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
