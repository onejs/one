#pragma once

#include <memory>
#include <string>

namespace one::zero {

struct Json;

class Client {
 public:
  Client(const std::string& path, const Json& schema, const std::string& clientID);
  ~Client();
  Client(const Client&) = delete;
  Client& operator=(const Client&) = delete;
  Json executeValue(const Json& request);
  void close();

 private:
  struct Impl;
  std::unique_ptr<Impl> impl_;
};

}
