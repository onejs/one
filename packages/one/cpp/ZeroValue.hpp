#pragma once

#include <NitroModules/JSIConverter.hpp>
#include <memory>

namespace one::zero {
struct Json;
}

namespace margelo::nitro::one {

using ZeroValue = std::shared_ptr<const ::one::zero::Json>;
using ZeroResult = std::variant<NullType, bool, std::string, double, ZeroValue>;

}

namespace margelo::nitro {

template <>
struct JSIConverter<one::ZeroValue> final {
  static one::ZeroValue fromJSI(jsi::Runtime& runtime, const jsi::Value& value);
  static jsi::Value toJSI(jsi::Runtime& runtime, const one::ZeroValue& value);
  static bool canConvert(jsi::Runtime&, const jsi::Value& value) { return value.isObject(); }
};

}
