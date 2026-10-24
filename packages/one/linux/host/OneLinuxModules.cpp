#include "OneLinuxModules.h"

#include <gio/gio.h>

#include "OneHostModule.h"

namespace facebook::react {

std::shared_ptr<TurboModule> OneLinuxCreateLinkingModule(std::shared_ptr<CallInvoker> jsInvoker)
{
  auto module = std::make_shared<OneHostModule>("LinkingManager", std::move(jsInvoker));
  module->method("getInitialURL", 0, [](jsi::Runtime &rt, const jsi::Value *, size_t) {
    return resolvedPromise(rt, jsi::Value::null());
  });
  module->method("canOpenURL", 1, [](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
    gchar *scheme = g_uri_parse_scheme(stringArg(rt, args, count, 0).c_str());
    GAppInfo *handler = scheme ? g_app_info_get_default_for_uri_scheme(scheme) : nullptr;
    bool available = handler != nullptr;
    if (handler) {
      g_object_unref(handler);
    }
    g_free(scheme);
    return resolvedPromise(rt, jsi::Value(available));
  });
  module->method("openURL", 1, [](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
    bool opened = g_app_info_launch_default_for_uri(stringArg(rt, args, count, 0).c_str(), nullptr, nullptr);
    return resolvedPromise(rt, jsi::Value(opened));
  });
  module->method("openSettings", 0, [](jsi::Runtime &rt, const jsi::Value *, size_t) {
    return resolvedPromise(rt, jsi::Value(false));
  });
  module->noop("addListener");
  module->noop("removeListeners");
  return module;
}

std::shared_ptr<TurboModule> OneLinuxCreateImageLoaderModule(std::shared_ptr<CallInvoker> jsInvoker)
{
  auto module = std::make_shared<OneHostModule>("ImageLoader", std::move(jsInvoker));
  for (const char *name : {"getSize", "getSizeWithHeaders", "prefetchImage", "prefetchImageWithMetadata", "queryCache"}) {
    module->method(name, 0, [name](jsi::Runtime &rt, const jsi::Value *, size_t) {
      auto reject = rt.global().getPropertyAsObject(rt, "Promise").getPropertyAsFunction(rt, "reject");
      return reject.call(rt, jsi::String::createFromUtf8(rt, std::string("ImageLoader.") + name + " is not available on Linux"));
    });
  }
  return module;
}

} // namespace facebook::react
