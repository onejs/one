#pragma once

#include <memory>
#include <string>

namespace one::zero {

class Client {
 public:
  Client(const std::string& path, const std::string& schema, const std::string& clientID);
  ~Client();
  Client(const Client&) = delete;
  Client& operator=(const Client&) = delete;
  std::string execute(const std::string& request);
  void close();

 private:
  struct Impl;
  std::unique_ptr<Impl> impl_;
};

}
