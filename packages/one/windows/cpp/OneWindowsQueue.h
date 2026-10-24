#pragma once

#include <chrono>
#include <condition_variable>
#include <deque>
#include <functional>
#include <mutex>
#include <thread>

#include "OneHostRuntime.h"

namespace facebook::react {

// a thread draining a queue, the serial contract the runtime expects
class OneWindowsQueue {
 public:
  void post(std::function<void()> &&work)
  {
    {
      std::lock_guard<std::mutex> lock(mutex_);
      if (quit_) {
        return;
      }
      queue_.push_back(std::move(work));
    }
    wake_.notify_one();
  }

  // runs posted work on the calling thread until quit and the queue is drained
  void run()
  {
    for (;;) {
      std::function<void()> work;
      {
        std::unique_lock<std::mutex> lock(mutex_);
        wake_.wait(lock, [this] { return quit_ || !queue_.empty(); });
        if (queue_.empty()) {
          return;
        }
        work = std::move(queue_.front());
        queue_.pop_front();
      }
      work();
    }
  }

  // runs posted work on the calling thread until `done` or the deadline;
  // `done` reads state that notify() announces
  bool runUntil(const std::function<bool()> &done, std::chrono::steady_clock::time_point deadline)
  {
    for (;;) {
      std::function<void()> work;
      {
        std::unique_lock<std::mutex> lock(mutex_);
        wake_.wait_until(lock, deadline, [&] { return !queue_.empty() || done(); });
        if (done()) {
          return true;
        }
        if (queue_.empty()) {
          return false;
        }
        work = std::move(queue_.front());
        queue_.pop_front();
      }
      work();
    }
  }

  void quit()
  {
    {
      std::lock_guard<std::mutex> lock(mutex_);
      quit_ = true;
    }
    wake_.notify_all();
  }

  // wakes runUntil to recheck its condition; call without holding a lock
  // `done` takes
  void notify()
  {
    { std::lock_guard<std::mutex> lock(mutex_); }
    wake_.notify_all();
  }

 private:
  std::mutex mutex_;
  std::condition_variable wake_;
  std::deque<std::function<void()>> queue_;
  bool quit_{false};
};

class OneWindowsJsThread : public OneMessageQueueThread {
 public:
  OneWindowsJsThread() : thread_([this] { queue_.run(); }) {}
  ~OneWindowsJsThread() override
  {
    quitSynchronous();
  }

  void runOnQueue(std::function<void()> &&work) override
  {
    queue_.post(std::move(work));
  }

  void quitSynchronous() override
  {
    queue_.quit();
    if (thread_.joinable() && std::this_thread::get_id() != thread_.get_id()) {
      thread_.join();
    }
  }

  bool isOnThread() const override
  {
    return std::this_thread::get_id() == thread_.get_id();
  }

 private:
  OneWindowsQueue queue_;
  std::thread thread_;
};

} // namespace facebook::react
