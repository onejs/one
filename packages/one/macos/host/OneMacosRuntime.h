#pragma once

#include <cxxreact/MessageQueueThread.h>
#include <react/runtime/PlatformTimerRegistry.h>

#include <functional>
#include <memory>
#include <mutex>
#include <unordered_map>

namespace facebook::react {

// The JavaScript thread: one NSThread running a CFRunLoop, with the serial
// queue contract React's runtime expects.
class OneMacosMessageQueueThread : public MessageQueueThread {
 public:
  OneMacosMessageQueueThread();
  ~OneMacosMessageQueueThread() override;

  void runOnQueue(std::function<void()> &&work) override;
  void runOnQueueSync(std::function<void()> &&work) override;
  void quitSynchronous() override;

  bool isOnThread() const;

 private:
  struct State;
  std::shared_ptr<State> state_;
};

// Timers fire from GCD sources; TimerManager hops to the JS thread itself.
class OneMacosTimerRegistry : public PlatformTimerRegistry {
 public:
  OneMacosTimerRegistry();
  ~OneMacosTimerRegistry() override;

  void createTimer(uint32_t timerID, double delayMS) override;
  void deleteTimer(uint32_t timerID) override;
  void createRecurringTimer(uint32_t timerID, double delayMS) override;
  void setTimerManager(std::weak_ptr<TimerManager> timerManager) override;
  void quit() override;

 private:
  void schedule(uint32_t timerID, double delayMS, bool repeats);

  std::mutex mutex_;
  std::weak_ptr<TimerManager> timerManager_;
  std::unordered_map<uint32_t, void *> sources_; // retained dispatch_source_t
  dispatch_queue_t queue_;
};

} // namespace facebook::react
