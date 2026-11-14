#import <Foundation/Foundation.h>
#include <hermes/hermes.h>
#include <NitroModules/InstallNitro.hpp>
#include <NitroModules/Dispatcher.hpp>
#include <NitroModules/HybridObjectRegistry.hpp>
#include "HybridOneZero.hpp"
#include <fstream>
#include <iostream>
#include <iterator>

using namespace facebook;
using namespace margelo::nitro;
static std::unique_ptr<facebook::hermes::HermesRuntime> runtime;
static std::string directory;
namespace margelo::nitro::one {
std::string storageDirectory() { return directory; }
}

class MainDispatcher : public Dispatcher {
 public:
  void runSync(std::function<void()>&& fn) override { fn(); }
  void runAsync(std::function<void()>&& fn) override {
    auto task = std::make_shared<std::function<void()>>(std::move(fn));
    dispatch_async(dispatch_get_main_queue(), ^{
      try {
        (*task)();
        runtime->drainMicrotasks();
      } catch (const std::exception& error) {
        std::cerr << error.what() << std::endl;
        std::_Exit(1);
      }
    });
  }
};

int main(int argc, char** argv) {
  @autoreleasepool {
    if (argc != 3) return 2;
    directory = argv[2];
    runtime = facebook::hermes::makeHermesRuntime(
        ::hermes::vm::RuntimeConfig::Builder().withMicrotaskQueue(true).build());
    runtime->global().setProperty(*runtime, "global", runtime->global());
    HybridObjectRegistry::registerHybridObjectConstructor(
        "OneZero", [] { return std::make_shared<margelo::nitro::one::HybridOneZero>(); });
    install(*runtime, std::make_shared<MainDispatcher>());
    runtime->global().setProperty(
        *runtime, "report",
        jsi::Function::createFromHostFunction(
            *runtime, jsi::PropNameID::forAscii(*runtime, "report"), 2,
            [](jsi::Runtime& rt, const jsi::Value&, const jsi::Value* args, size_t count) {
              std::cout << args[0].asString(rt).utf8(rt) << std::endl;
              std::_Exit(count > 1 && args[1].getBool() ? 1 : 0);
              return jsi::Value::undefined();
            }));
    std::ifstream file(argv[1]);
    if (!file) {
      std::cerr << "cannot open probe script: " << argv[1] << std::endl;
      return 1;
    }
    std::string source{std::istreambuf_iterator<char>(file), std::istreambuf_iterator<char>()};
    try {
      runtime->evaluateJavaScript(std::make_shared<jsi::StringBuffer>(source), "zero-probe.js");
      runtime->drainMicrotasks();
    } catch (const std::exception& error) {
      std::cerr << error.what() << std::endl;
      return 1;
    }
    dispatch_main();
  }
}
