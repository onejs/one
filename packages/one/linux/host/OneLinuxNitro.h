#pragma once

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/TurboModule.h>

#include <memory>

namespace facebook::react {

// the NitroModules TurboModule: install puts global.NitroModulesProxy in the
// runtime. No hybrid objects are registered, so services that One's native
// build provides fail at createHybridObject.
std::shared_ptr<TurboModule> OneLinuxCreateNitroModule(std::shared_ptr<CallInvoker> jsInvoker);

} // namespace facebook::react
