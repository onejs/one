#include "HybridOneZero.hpp"
#include "OneStorageDirectory.hpp"
#include <stdexcept>

namespace margelo::nitro::one {

std::shared_ptr<Promise<void>> HybridOneZero::open(const std::string& name,
                                                   const std::string& schemaJson,
                                                   const std::string& clientID) {
  if (name.empty() || name.size() > 128 ||
      name.find_first_not_of("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_") !=
          std::string::npos) {
    throw std::invalid_argument(
        "native Zero name must contain 1-128 letters, digits, hyphens or underscores");
  }
  std::string path = storageDirectory() + "/zero-" + name + ".sqlite";
  return Promise<void>::async([state = state_, path, schemaJson, clientID]() {
    std::lock_guard<std::mutex> guard(state->mutex);
    if (state->client) throw std::runtime_error("native Zero client is already open");
    state->client = std::make_unique<::one::zero::Client>(path, schemaJson, clientID);
  });
}

std::shared_ptr<Promise<std::string>> HybridOneZero::execute(const std::string& requestJson) {
  return Promise<std::string>::async([state = state_, requestJson]() {
    std::lock_guard<std::mutex> guard(state->mutex);
    if (!state->client) throw std::runtime_error("native Zero client is closed");
    return state->client->execute(requestJson);
  });
}

std::shared_ptr<Promise<void>> HybridOneZero::close() {
  return Promise<void>::async([state = state_]() {
    std::lock_guard<std::mutex> guard(state->mutex);
    if (state->client) {
      state->client->close();
      state->client.reset();
    }
  });
}

}
