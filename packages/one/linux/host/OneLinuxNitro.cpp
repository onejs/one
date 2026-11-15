#include "OneLinuxNitro.h"

#include <CallInvokerDispatcher.hpp>
#include <InstallNitro.hpp>

#include "OneHostModule.h"

namespace facebook::react {

std::shared_ptr<TurboModule> OneLinuxCreateNitroModule(std::shared_ptr<CallInvoker> jsInvoker)
{
  auto module = std::make_shared<OneHostModule>("NitroModules", jsInvoker);
  module->method("install", 0, [jsInvoker](jsi::Runtime &rt, const jsi::Value *, size_t) -> jsi::Value {
    try {
      margelo::nitro::install(rt, std::make_shared<margelo::nitro::CallInvokerDispatcher>(jsInvoker));
    } catch (const std::exception &error) {
      return jsi::String::createFromUtf8(rt, error.what());
    }
    return jsi::Value::null();
  });
  return module;
}

} // namespace facebook::react
