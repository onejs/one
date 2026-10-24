#pragma once

#include <functional>
#include <memory>
#include <mutex>
#include <unordered_map>

#include "OneHostRuntime.h"

namespace facebook::react {

// The JavaScript thread: one NSThread running a CFRunLoop, with the serial
// queue contract React's runtime expects.
class OneMacosMessageQueueThread : public OneMessageQueueThread {
 public:
  OneMacosMessageQueueThread();
  ~OneMacosMessageQueueThread() override;

  void runOnQueue(std::function<void()> &&work) override;
  void quitSynchronous() override;

  bool isOnThread() const override;

 private:
  struct State;
  std::shared_ptr<State> state_;
};

// Timers fire from GCD sources; TimerManager hops to the JS thread itself.
class OneMacosTimerRegistry : public OneTimerRegistry {
 public:
  OneMacosTimerRegistry();
  ~OneMacosTimerRegistry() override;

 protected:
  void arm(uint32_t timerID, double delayMS, bool repeats) override;
  void disarm(uint32_t timerID) override;
  void disarmAll() override;

 private:
  std::mutex mutex_;
  std::unordered_map<uint32_t, void *> sources_; // retained dispatch_source_t
  dispatch_queue_t queue_;
};

} // namespace facebook::react
