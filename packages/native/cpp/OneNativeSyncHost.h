#pragma once

#include <jsi/jsi.h>
#include <memory>

namespace facebook::react {
class CallInvoker;
} // namespace facebook::react

namespace worklets {
class WorkletRuntime;
} // namespace worklets

// installs global.__OneNativeSyncState = { create } on the RN runtime and the
// worklets UI runtime. create() binds a Swift registry entry; the returned
// handle reads and writes it synchronously from either runtime.
void installOneNativeSyncState(
    jsi::Runtime &rnRuntime,
    std::shared_ptr<worklets::WorkletRuntime> uiRuntime,
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker);
