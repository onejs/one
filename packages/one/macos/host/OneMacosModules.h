#pragma once

#include <memory>
#include <string>

#include "OneHostModules.h"

// format for js console text in the unified log: readable in Debug builds,
// redacted in Release so app logs never persist tokens or credentialed urls
#if DEBUG
#define ONE_MACOS_JS_TEXT "%{public}s"
#else
#define ONE_MACOS_JS_TEXT "%{private}s"
#endif

namespace facebook::react {

// NativeAnimatedModule on RN's C++ animated renderer, frames from a display link
std::shared_ptr<TurboModule> OneMacosCreateAnimatedModule(std::shared_ptr<CallInvoker> jsInvoker);

// Returns nullptr for modules the host does not provide.
std::shared_ptr<TurboModule> OneMacosCreateTurboModule(
    jsi::Runtime &runtime,
    const std::string &name,
    std::shared_ptr<CallInvoker> jsInvoker,
    const OneHostModuleContext &context);

} // namespace facebook::react

#ifdef __OBJC__
#import <AppKit/AppKit.h>

// "light" or "dark", the value of the Appearance module's color scheme
NSString *OneMacosColorSchemeName(NSAppearance *appearance);
#endif
