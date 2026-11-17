#include "BunRuntime.h"
#include <cxxreact/MessageQueueThread.h>
#include <fbjni/fbjni.h>
#include <react/runtime/jni/JJSRuntimeFactory.h>

namespace facebook::react {

class BunInstance : public jni::HybridClass<BunInstance, JJSRuntimeFactory> {
 public:
  static constexpr auto kJavaDescriptor = "Ldev/onejs/bun/BunInstance;";

  static jni::local_ref<jhybriddata> initHybrid(jni::alias_ref<jclass>) {
    return makeCxxInstance();
  }

  static void registerNatives() {
    registerHybrid({makeNativeMethod("initHybrid", initHybrid)});
  }

  std::unique_ptr<JSRuntime> createJSRuntime(
      std::shared_ptr<MessageQueueThread> queue) noexcept override {
    std::unique_ptr<jsi::Runtime> runtime;
    queue->runOnQueueSync([&] { runtime = bun::makeBunRuntime(); });
    if (!runtime) {
      abort();
    }
    return std::make_unique<JSIRuntimeHolder>(std::move(runtime));
  }

 private:
  friend HybridBase;
};

} // namespace facebook::react

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return facebook::jni::initialize(vm, [] {
    facebook::react::BunInstance::registerNatives();
  });
}
