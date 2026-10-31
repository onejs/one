#pragma once

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/TurboModule.h>

#include <memory>
#include "OneHostModule.h"

namespace facebook::react {

class OneLinuxAppShell;
std::shared_ptr<TurboModule> OneLinuxCreateWindowModule(std::shared_ptr<CallInvoker>, std::weak_ptr<OneLinuxAppShell>);

// urls open in the default app through GIO; the app has no initial url
std::shared_ptr<TurboModule> OneLinuxCreateLinkingModule(std::shared_ptr<CallInvoker> jsInvoker);

// image loading is not provided on Linux yet, so every request rejects
std::shared_ptr<TurboModule> OneLinuxCreateImageLoaderModule(std::shared_ptr<CallInvoker> jsInvoker);

} // namespace facebook::react
