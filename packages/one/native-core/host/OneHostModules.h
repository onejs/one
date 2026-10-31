#pragma once

#include "OneHostModule.h"

namespace facebook::react {

std::shared_ptr<TurboModule> OneHostCreateAppCommandsModule(
    const std::string &name, std::shared_ptr<CallInvoker> jsInvoker, const OneHostModuleContext &context);

// The TurboModules both hosts provide the same way: platform constants, device
// info, appearance, app state, exception reporting, dev settings, the C++
// performance, microtask, DOM and idle callback modules, and the inert
// stand-ins for modules with nothing to do on a desktop. Returns nullptr for
// any other name.
std::shared_ptr<TurboModule> OneHostCreateTurboModule(
    const std::string &name,
    std::shared_ptr<CallInvoker> jsInvoker,
    const OneHostModuleContext &context);

} // namespace facebook::react
