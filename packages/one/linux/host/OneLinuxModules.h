#pragma once

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/TurboModule.h>

#include <memory>

namespace facebook::react {

// urls open in the default app through GIO; the app has no initial url
std::shared_ptr<TurboModule> OneLinuxCreateLinkingModule(std::shared_ptr<CallInvoker> jsInvoker);

// image loading is not provided on Linux yet, so every request rejects
std::shared_ptr<TurboModule> OneLinuxCreateImageLoaderModule(std::shared_ptr<CallInvoker> jsInvoker);

} // namespace facebook::react
