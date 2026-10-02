#include <fbjni/fbjni.h>

#include "OneStorageDirectory.hpp"

#include <stdexcept>

namespace margelo::nitro::one {

std::string storageDirectory() {
  static const auto directoryClass =
      facebook::jni::findClassStatic("com/margelo/nitro/one/OneStorageDirectory");
  static const auto path =
      directoryClass->getStaticMethod<facebook::jni::local_ref<facebook::jni::JString>()>("path");
  auto directory = path(directoryClass);
  if (!directory) {
    throw std::runtime_error("E_STORAGE_UNAVAILABLE: Storage: React context is not ready");
  }
  return directory->toStdString();
}

} // namespace margelo::nitro::one
