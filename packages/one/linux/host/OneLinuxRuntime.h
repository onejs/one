#pragma once

#include <glib.h>

#include <condition_variable>
#include <deque>
#include <functional>
#include <map>
#include <memory>
#include <mutex>
#include <thread>

#include <react/utils/RunLoopObserver.h>

#include "OneHostRuntime.h"

namespace facebook::react {

// The JavaScript thread: one thread draining a work queue, with the serial
// queue contract React's runtime expects.
class OneLinuxMessageQueueThread : public OneMessageQueueThread {
 public:
  OneLinuxMessageQueueThread();
  ~OneLinuxMessageQueueThread() override;

  void runOnQueue(std::function<void()> &&work) override;
  void quitSynchronous() override;

  bool isOnThread() const override;

 private:
  void run();

  std::mutex mutex_;
  std::condition_variable wake_;
  std::deque<std::function<void()>> queue_;
  bool quit_{false};
  std::thread thread_;
};

// Timers are GLib timeout sources on the main context; TimerManager hops to the
// JS thread itself.
class OneLinuxTimerRegistry : public OneTimerRegistry {
 public:
  ~OneLinuxTimerRegistry() override;

 protected:
  void arm(uint32_t timerID, double delayMS, bool repeats) override;
  void disarm(uint32_t timerID) override;
  void disarmAll() override;

 private:
  std::mutex mutex_;
  std::map<uint32_t, GSource *> sources_;
};

// BeforeWaiting is the prepare step of a source on the main context, which GLib
// runs on every iteration before the loop polls and sleeps.
class OneLinuxRunLoopObserver : public RunLoopObserver {
 public:
  OneLinuxRunLoopObserver(Activity activities, WeakOwner owner);
  ~OneLinuxRunLoopObserver() noexcept override;

  bool isOnRunLoopThread() const noexcept override;

  void tick() const noexcept;

 protected:
  void startObserving() const noexcept override;
  void stopObserving() const noexcept override;

 private:
  mutable GSource *source_{nullptr};
  mutable std::mutex mutex_;
};

// posts to the main loop; the work runs before the next frame is laid out
void OneLinuxDispatchMain(std::function<void()> work);

} // namespace facebook::react
