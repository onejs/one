#pragma once

// swift exports this nitro alias in One-Swift.h. both module precompiles and
// objc++ files importing that header directly must see its defining header.
#ifdef __cplusplus
#include <NitroModules/AnyMapUtils.hpp>
#endif
