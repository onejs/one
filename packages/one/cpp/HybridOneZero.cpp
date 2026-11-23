#include "HybridOneZero.hpp"
#include "OneStorageDirectory.hpp"
#include "zero/Json.hpp"
#include <filesystem>
#include <mutex>
#include <set>
#include <stdexcept>
#include <string>

namespace margelo::nitro {
namespace {
using ::one::zero::Json;

Json decode(jsi::Runtime& runtime, const jsi::Value& value, const jsi::Function& keys,
             unsigned depth) {
  if (depth > 128) throw std::invalid_argument("JSON nesting exceeds 128 levels");
  if (value.isUndefined() || value.isNull()) return nullptr;
  if (value.isBool()) return value.getBool();
  if (value.isNumber()) {
    double number = value.getNumber();
    if (!std::isfinite(number))
      throw std::invalid_argument("Native Zero values must contain finite numbers");
    return number == 0 ? 0 : number;
  }
  if (value.isString()) return value.getString(runtime).utf8(runtime);
  if (value.isObject()) {
    auto object = value.getObject(runtime);
    if (object.isArray(runtime)) {
      auto array = object.getArray(runtime);
      auto size = array.size(runtime);
      Json::Array result;
      result.reserve(size);
      for (size_t i = 0; i < size; ++i)
        result.push_back(decode(runtime, array.getValueAtIndex(runtime, i), keys, depth + 1));
      return result;
    }
    if (!object.isFunction(runtime)) {
      auto names = keys.call(runtime, object).getObject(runtime).getArray(runtime);
      Json::Object result;
      auto size = names.size(runtime);
      for (size_t i = 0; i < size; ++i) {
        auto key = names.getValueAtIndex(runtime, i).getString(runtime);
        auto member = object.getProperty(runtime, key);
        if (!member.isUndefined())
          result.emplace(key.utf8(runtime), decode(runtime, member, keys, depth + 1));
      }
      return result;
    }
  }
  throw std::invalid_argument("Native Zero requires JSON values");
}

jsi::Value encode(jsi::Runtime& runtime, const Json& value) {
  if (value.null()) return jsi::Value::null();
  if (auto boolean = std::get_if<bool>(&value.value)) return jsi::Value(*boolean);
  if (auto number = std::get_if<double>(&value.value)) return jsi::Value(*number);
  if (auto text = std::get_if<std::string>(&value.value))
    return jsi::String::createFromUtf8(runtime, *text);
  if (auto items = std::get_if<Json::Array>(&value.value)) {
    auto result = jsi::Array(runtime, items->size());
    for (size_t i = 0; i < items->size(); ++i)
      result.setValueAtIndex(runtime, i, encode(runtime, (*items)[i]));
    return result;
  }
  const auto& fields = value.fields();
  auto result = jsi::Object(runtime);
  // preserve __proto__ as an own data property, like JSON.parse.
  const bool hasPrototypeField = fields.contains("__proto__");
  jsi::Value prototype;
  if (hasPrototypeField) {
    prototype = result.getPrototype(runtime);
    result.setPrototype(runtime, jsi::Value::null());
  }
  for (const auto& [key, field] : fields)
    result.setProperty(runtime, jsi::PropNameID::forUtf8(runtime, key), encode(runtime, field));
  if (hasPrototypeField) result.setPrototype(runtime, prototype);
  return result;
}
}

one::ZeroValue JSIConverter<one::ZeroValue>::fromJSI(jsi::Runtime& runtime, const jsi::Value& value) {
  auto keys = runtime.global()
                  .getPropertyAsObject(runtime, "Object")
                  .getPropertyAsFunction(runtime, "keys");
  return std::make_shared<const Json>(decode(runtime, value, keys, 0));
}

jsi::Value JSIConverter<one::ZeroValue>::toJSI(jsi::Runtime& runtime, const one::ZeroValue& value) {
  return encode(runtime, *value);
}
}

namespace margelo::nitro::one {

#if ONE_ZERO_SQLITE
namespace {
std::mutex openPathsMutex;
std::set<std::string> openPaths;

std::string canonicalizePath(const std::string& raw) {
  try {
    return std::filesystem::weakly_canonical(raw).string();
  } catch (...) {
    return std::filesystem::absolute(raw).lexically_normal().string();
  }
}

bool tryRegisterOpenPath(const std::string& path) {
  std::lock_guard<std::mutex> lock(openPathsMutex);
  return openPaths.insert(path).second;
}

void unregisterOpenPath(const std::string& path) {
  if (path.empty()) return;
  std::lock_guard<std::mutex> lock(openPathsMutex);
  openPaths.erase(path);
}
}  // namespace

struct HybridOneZero::State {
  std::mutex mutex;
  std::string canonicalPath;
  std::unique_ptr<::one::zero::Client> client;
  ~State() {
    if (!canonicalPath.empty()) {
      unregisterOpenPath(canonicalPath);
      canonicalPath.clear();
    }
  }
};

HybridOneZero::HybridOneZero() : HybridObject(TAG), state_(std::make_shared<State>()) {}
HybridOneZero::~HybridOneZero() = default;

std::shared_ptr<Promise<void>> HybridOneZero::open(const std::string& name,
                                                   ZeroValue schema,
                                                   const std::string& clientID) {
  if (name.empty() || name.size() > 128 ||
      name.find_first_not_of("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_") !=
          std::string::npos) {
    throw std::invalid_argument(
        "native Zero name must contain 1-128 letters, "
        "digits, hyphens or underscores");
  }
  std::string rawPath = zeroStorageDirectory() + "/zero-" + name + ".sqlite";
  std::string canonicalPath = canonicalizePath(rawPath);

  return Promise<void>::async([state = state_, canonicalPath, schema = std::move(schema), clientID]() {
    std::lock_guard<std::mutex> guard(state->mutex);
    if (state->client) throw std::runtime_error("native Zero client is already open");
    if (!tryRegisterOpenPath(canonicalPath)) {
      throw std::runtime_error("native Zero store is already open: " + canonicalPath);
    }
    try {
      state->client = std::make_unique<::one::zero::Client>(canonicalPath, *schema, clientID);
      state->canonicalPath = canonicalPath;
    } catch (...) {
      unregisterOpenPath(canonicalPath);
      state->client.reset();
      state->canonicalPath.clear();
      throw;
    }
  });
}

std::shared_ptr<Promise<ZeroResult>> HybridOneZero::execute(ZeroValue request) {
  return Promise<ZeroResult>::async([state = state_, request = std::move(request)]() -> ZeroResult {
    std::lock_guard<std::mutex> guard(state->mutex);
    if (!state->client) throw std::runtime_error("native Zero client is closed");
    return std::make_shared<const Json>(state->client->executeValue(*request));
  });
}

std::shared_ptr<Promise<void>> HybridOneZero::close() {
  return Promise<void>::async([state = state_]() {
    std::lock_guard<std::mutex> guard(state->mutex);
    std::string path = state->canonicalPath;
    state->canonicalPath.clear();
    unregisterOpenPath(path);
    if (state->client) {
      try {
        state->client->close();
      } catch (...) {
        state->client.reset();
        throw;
      }
      state->client.reset();
    }
  });
}

#else
struct HybridOneZero::State {
  std::mutex mutex;
};

HybridOneZero::HybridOneZero() : HybridObject(TAG), state_(std::make_shared<State>()) {}
HybridOneZero::~HybridOneZero() = default;

std::shared_ptr<Promise<void>> HybridOneZero::open(const std::string&, ZeroValue,
                                                   const std::string&) {
  throw std::runtime_error(
      "Native Zero requires the op-sqlite SQLite backend; "
      "libsql and turso are not supported");
}
std::shared_ptr<Promise<ZeroResult>> HybridOneZero::execute(ZeroValue) {
  throw std::runtime_error(
      "Native Zero requires the op-sqlite SQLite backend; "
      "libsql and turso are not supported");
}
std::shared_ptr<Promise<void>> HybridOneZero::close() { return Promise<void>::resolved(); }
#endif

}  // namespace margelo::nitro::one
