#pragma once

#include "HybridOneZeroSpec.hpp"
#ifndef ONE_ZERO_SQLITE
#define ONE_ZERO_SQLITE 1
#endif
#if ONE_ZERO_SQLITE
#include "zero/Client.hpp"
#endif
#include <memory>
#include <mutex>
#include <string>

namespace margelo::nitro::one {

class HybridOneZero : public HybridOneZeroSpec {
 public:
  HybridOneZero();
  ~HybridOneZero() override;
  std::shared_ptr<Promise<void>> open(const std::string& name, const std::string& schemaJson,
                                      const std::string& clientID) override;
  std::shared_ptr<Promise<std::string>> execute(const std::string& requestJson) override;
  std::shared_ptr<Promise<void>> close() override;

 private:
  struct State;
  std::shared_ptr<State> state_;
};

}  // namespace margelo::nitro::one
