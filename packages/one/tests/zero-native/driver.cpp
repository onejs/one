#include "Client.hpp"
#include "Json.hpp"
#include <fstream>
#include <iostream>
#include <iterator>
#include <memory>
#include <unistd.h>

int main(int argc, char** argv) {
  if (argc != 4) return 2;
  std::ifstream input(argv[2]);
  std::string schema{std::istreambuf_iterator<char>(input), std::istreambuf_iterator<char>()};
  try {
    auto client = std::make_unique<one::zero::Client>(argv[1], schema, argv[3]);
    std::cout << "{\"ready\":true}" << std::endl;
    std::string request;
    while (std::getline(std::cin, request)) {
      if (request == "@crash") _exit(0);
      try {
        std::string result = client->execute(request);
        std::cout << "{\"result\":" << result << "}" << std::endl;
      } catch (const std::exception& error) {
        std::cout << one::zero::Json(one::zero::Json::Object{{"error", error.what()}}).dump()
                  << std::endl;
      }
    }
    client->close();
  } catch (const std::exception& error) {
    std::cout << one::zero::Json(one::zero::Json::Object{{"error", error.what()}}).dump()
              << std::endl;
    return 1;
  }
}
