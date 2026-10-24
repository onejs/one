#pragma once

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/TurboModule.h>
#include <jsi/jsi.h>

#include <functional>
#include <memory>

namespace facebook::react {

// The WorkletsModule TurboModule: owns react-native-worklets' native proxy and
// installs it on the main runtime. Worklet runtimes run on Hermes. The GLib main
// thread is the UI thread.
std::shared_ptr<TurboModule> OneLinuxCreateWorkletsModule(
    jsi::Runtime &runtime,
    std::shared_ptr<CallInvoker> jsInvoker,
    std::function<bool()> isJavaScriptQueue);

} // namespace facebook::react
