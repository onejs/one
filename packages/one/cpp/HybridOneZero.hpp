#pragma once

#include "HybridOneZeroSpec.hpp"
#include "zero/Client.hpp"
#include <memory>
#include <mutex>

namespace margelo::nitro::one {

class HybridOneZero : public HybridOneZeroSpec {
 public:
  HybridOneZero() : HybridObject(TAG), state_(std::make_shared<State>()) {}
  std::shared_ptr<Promise<void>> open(const std::string& name, const std::string& schemaJson, const std::string& clientID) override;
  std::shared_ptr<Promise<std::string>> execute(const std::string& requestJson) override;
  std::shared_ptr<Promise<void>> close() override;

 private:
  struct State {
    std::mutex mutex;
    std::unique_ptr<::one::zero::Client> client;
  };
  std::shared_ptr<State> state_;
};

}
