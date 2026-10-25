#pragma once

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/TurboModule.h>
#include <jsi/jsi.h>

#include <memory>

namespace facebook::react {

// The OPSQLite TurboModule: installs op-sqlite's JSI proxy (built on the system
// sqlite) on the main runtime, mirroring the iOS glue in ios/OPSQLite.mm.
std::shared_ptr<TurboModule> OneMacosCreateOpSqliteModule(jsi::Runtime &runtime, std::shared_ptr<CallInvoker> jsInvoker);

} // namespace facebook::react
