#include "HybridOneZero.hpp"
#import <Foundation/Foundation.h>
#include <NitroModules/Dispatcher.hpp>
#include <NitroModules/HybridObjectRegistry.hpp>
#include <NitroModules/InstallNitro.hpp>
#include <fstream>
#include <hermes/hermes.h>
#include <iostream>
#include <iterator>
#include <unordered_map>

using namespace facebook;
using namespace margelo::nitro;
static std::unique_ptr<facebook::hermes::HermesRuntime> runtime;
static std::string directory;
static std::unordered_map<uint64_t, std::shared_ptr<jsi::Function>> timers;
static uint64_t nextTimer = 0;
namespace margelo::nitro::one {
std::string storageDirectory() { return directory; }
}  // namespace margelo::nitro::one

static void runTask(std::function<void()> task) {
  try {
    task();
    runtime->drainMicrotasks();
  } catch (const std::exception &error) {
    std::cerr << error.what() << std::endl;
    std::_Exit(1);
  }
}

class MainDispatcher : public Dispatcher {
 public:
  void runSync(std::function<void()> &&fn) override { fn(); }
  void runAsync(std::function<void()> &&fn) override {
    auto task = std::make_shared<std::function<void()>>(std::move(fn));
    dispatch_async(dispatch_get_main_queue(), ^{
      runTask(*task);
    });
  }
};

int main(int argc, char **argv) {
  @autoreleasepool {
    if (argc != 3) return 2;
    directory = argv[2];
    runtime = facebook::hermes::makeHermesRuntime(
        ::hermes::vm::RuntimeConfig::Builder().withMicrotaskQueue(true).build());
    runtime->global().setProperty(*runtime, "global", runtime->global());
    runtime->global().setProperty(
        *runtime, "setTimeout",
        jsi::Function::createFromHostFunction(
            *runtime, jsi::PropNameID::forAscii(*runtime, "setTimeout"), 2,
            [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
              const auto id = ++nextTimer;
              timers[id] = std::make_shared<jsi::Function>(args[0].asObject(rt).asFunction(rt));
              const auto delay = count > 1 ? args[1].asNumber() : 0;
              dispatch_after(
                  dispatch_time(DISPATCH_TIME_NOW, static_cast<int64_t>(delay * NSEC_PER_MSEC)),
                  dispatch_get_main_queue(), ^{
                    const auto found = timers.find(id);
                    if (found == timers.end()) return;
                    const auto callback = found->second;
                    timers.erase(found);
                    runTask([callback] { callback->call(*runtime); });
                  });
              return jsi::Value(static_cast<double>(id));
            }));
    runtime->global().setProperty(
        *runtime, "clearTimeout",
        jsi::Function::createFromHostFunction(
            *runtime, jsi::PropNameID::forAscii(*runtime, "clearTimeout"), 1,
            [](jsi::Runtime &, const jsi::Value &, const jsi::Value *args, size_t) {
              timers.erase(static_cast<uint64_t>(args[0].asNumber()));
              return jsi::Value::undefined();
            }));
    HybridObjectRegistry::registerHybridObjectConstructor(
        "OneZero", [] { return std::make_shared<margelo::nitro::one::HybridOneZero>(); });
    install(*runtime, std::make_shared<MainDispatcher>());
    runtime->global().setProperty(
        *runtime, "report",
        jsi::Function::createFromHostFunction(
            *runtime, jsi::PropNameID::forAscii(*runtime, "report"), 2,
            [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
#if ONE_ZERO_SQLITE
              if (!(count > 1 && args[1].getBool())) {
                NSURL *url =
                    [NSURL fileURLWithFileSystemRepresentation:(directory + "/zero").c_str()
                                                   isDirectory:YES
                                                 relativeToURL:nil];
                NSNumber *excluded = nil;
                NSError *error = nil;
                if (![url getResourceValue:&excluded
                                    forKey:NSURLIsExcludedFromBackupKey
                                     error:&error] ||
                    !excluded.boolValue) {
                  std::cerr << "native Zero directory must be excluded from backup" << std::endl;
                  std::_Exit(1);
                }
              }
#endif
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
    } catch (const std::exception &error) {
      std::cerr << error.what() << std::endl;
      return 1;
    }
    dispatch_main();
  }
}
