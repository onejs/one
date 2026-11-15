#pragma once

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/TurboModule.h>
#include <jsi/jsi.h>

#include <functional>
#include <memory>

namespace worklets {
class NetworkingBackend;
}

namespace facebook::react {

// The WorkletsModule TurboModule: owns react-native-worklets' native proxy and
// installs it on the main runtime. Worklet runtimes run on Hermes.
std::shared_ptr<TurboModule> OneMacosCreateWorkletsModule(
    jsi::Runtime &runtime,
    std::shared_ptr<CallInvoker> jsInvoker,
    std::function<bool()> isJavaScriptQueue);

} // namespace facebook::react

// platform pieces in OneMacosWorkletsPlatform.mm
std::shared_ptr<worklets::NetworkingBackend> OneMacosMakeWorkletsNetworkingBackend();
// calls back on the main thread with the target timestamp of the next frame, in ms
void OneMacosRequestAnimationFrame(std::function<void(double)> callback);
void OneMacosInvalidateAnimationFrames();
