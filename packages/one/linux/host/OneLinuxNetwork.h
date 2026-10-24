#pragma once

#include <gio/gio.h>

#include <functional>
#include <memory>
#include <string>

#include "OneHostModule.h"

namespace facebook::react {

// Downloads a script from the dev server. `done` runs on the main thread with
// the body, or with an error message when the request failed; cancelling the
// returned handle's cancellable ends the request with no call to `done`.
GCancellable *OneLinuxFetchScript(
    const std::string &url,
    std::function<void(const std::string &body, const std::string &error)> done);

// the WebSocketModule the dev bundle opens its Fast Refresh socket with
std::shared_ptr<OneHostModule> OneLinuxCreateWebSocketModule(
    std::shared_ptr<CallInvoker> jsInvoker,
    const OneHostModuleContext &context);

} // namespace facebook::react
