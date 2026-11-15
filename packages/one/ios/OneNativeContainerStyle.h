#pragma once
// C++ only: the Swift module umbrella imports every public header, so the guard keeps
// these templates out of Swift's clang module.
#ifdef __cplusplus
#import "OneNativeContainerComponentView.h"
#import "One-Swift.h"
#import "OneNativeStyleDictionary.h"

// every container takes swiftStyle, so every container forwards the SDK events its
// modifiers raise through its own generated emitter, which is the one thing that differs.
template <typename Emitter>
static void OneNativeForwardSwiftStyleEvents(OneNativeContainerComponentView *host) {
  __weak OneNativeContainerComponentView *weakHost = host;
  host.container.onSwiftStyleEvent = ^(NSString *name, NSString *value) {
    OneNativeContainerComponentView *strongHost = weakHost;
    if (!strongHost) return;
    auto emitter = std::static_pointer_cast<const Emitter>([strongHost currentEventEmitter]);
    if (!emitter) return;
    emitter->onNativeSDKEvent({.name = std::string(name.UTF8String), .value = std::string(value.UTF8String)});
  };
}
#endif
