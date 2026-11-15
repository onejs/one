#pragma once

#include <string>

namespace margelo::nitro::one {

// the app's private directory for One.Storage, created if missing: application
// support on iOS, the files directory on Android. each platform implements it.
std::string storageDirectory();
std::string zeroStorageDirectory();

}  // namespace margelo::nitro::one
