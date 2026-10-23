#import <Foundation/Foundation.h>

#include <react/runtime/TimerManager.h>

#import "OneMacosRuntime.h"

namespace facebook::react {

struct OneMacosMessageQueueThread::State {
  NSThread *thread{nil};
  CFRunLoopRef runLoop{nullptr};
  dispatch_semaphore_t ready{dispatch_semaphore_create(0)};
  dispatch_semaphore_t finished{dispatch_semaphore_create(0)};
  std::mutex mutex;
  bool quit{false};
};

OneMacosMessageQueueThread::OneMacosMessageQueueThread() : state_(std::make_shared<State>())
{
  auto state = state_;
  state->thread = [[NSThread alloc] initWithBlock:^{
    @autoreleasepool {
      pthread_setname_np("com.one.macos.javascript");
      state->runLoop = CFRunLoopGetCurrent();

      // a source with no work keeps the run loop from returning immediately
      CFRunLoopSourceContext context = {};
      CFRunLoopSourceRef keepAlive = CFRunLoopSourceCreate(nullptr, 0, &context);
      CFRunLoopAddSource(state->runLoop, keepAlive, kCFRunLoopDefaultMode);
      dispatch_semaphore_signal(state->ready);

      while (CFRunLoopRunInMode(kCFRunLoopDefaultMode, DBL_MAX, false) != kCFRunLoopRunStopped) {
      }

      CFRunLoopRemoveSource(state->runLoop, keepAlive, kCFRunLoopDefaultMode);
      CFRelease(keepAlive);
    }
    dispatch_semaphore_signal(state->finished);
  }];
  state->thread.qualityOfService = NSQualityOfServiceUserInteractive;
  state->thread.stackSize = 4 * 1024 * 1024;
  [state->thread start];
  dispatch_semaphore_wait(state->ready, DISPATCH_TIME_FOREVER);
}

OneMacosMessageQueueThread::~OneMacosMessageQueueThread()
{
  quitSynchronous();
}

bool OneMacosMessageQueueThread::isOnThread() const
{
  return [NSThread currentThread] == state_->thread;
}

void OneMacosMessageQueueThread::runOnQueue(std::function<void()> &&work)
{
  std::lock_guard<std::mutex> lock(state_->mutex);
  if (state_->quit) {
    return;
  }
  auto shared = std::make_shared<std::function<void()>>(std::move(work));
  CFRunLoopPerformBlock(state_->runLoop, kCFRunLoopCommonModes, ^{
    (*shared)();
  });
  CFRunLoopWakeUp(state_->runLoop);
}

void OneMacosMessageQueueThread::runOnQueueSync(std::function<void()> &&work)
{
  if (isOnThread()) {
    work();
    return;
  }
  auto done = dispatch_semaphore_create(0);
  runOnQueue([work = std::move(work), done]() {
    work();
    dispatch_semaphore_signal(done);
  });
  dispatch_semaphore_wait(done, DISPATCH_TIME_FOREVER);
}

void OneMacosMessageQueueThread::quitSynchronous()
{
  {
    std::lock_guard<std::mutex> lock(state_->mutex);
    if (state_->quit) {
      return;
    }
    state_->quit = true;
  }
  auto state = state_;
  CFRunLoopPerformBlock(state->runLoop, kCFRunLoopCommonModes, ^{
    CFRunLoopStop(CFRunLoopGetCurrent());
  });
  CFRunLoopWakeUp(state->runLoop);
  if (!isOnThread()) {
    dispatch_semaphore_wait(state->finished, DISPATCH_TIME_FOREVER);
  }
}

OneMacosTimerRegistry::OneMacosTimerRegistry()
    : queue_(dispatch_queue_create("com.one.macos.timers", DISPATCH_QUEUE_SERIAL))
{
}

OneMacosTimerRegistry::~OneMacosTimerRegistry()
{
  quit();
}

void OneMacosTimerRegistry::setTimerManager(std::weak_ptr<TimerManager> timerManager)
{
  std::lock_guard<std::mutex> lock(mutex_);
  timerManager_ = timerManager;
}

void OneMacosTimerRegistry::createTimer(uint32_t timerID, double delayMS)
{
  schedule(timerID, delayMS, false);
}

void OneMacosTimerRegistry::createRecurringTimer(uint32_t timerID, double delayMS)
{
  schedule(timerID, delayMS, true);
}

void OneMacosTimerRegistry::schedule(uint32_t timerID, double delayMS, bool repeats)
{
  dispatch_source_t source = dispatch_source_create(DISPATCH_SOURCE_TYPE_TIMER, 0, 0, queue_);
  int64_t delayNs = static_cast<int64_t>(std::max(delayMS, 1.0) * NSEC_PER_MSEC);
  dispatch_source_set_timer(
      source, dispatch_time(DISPATCH_TIME_NOW, delayNs), repeats ? delayNs : DISPATCH_TIME_FOREVER, NSEC_PER_MSEC);

  dispatch_source_set_event_handler(source, ^{
    std::shared_ptr<TimerManager> manager;
    {
      std::lock_guard<std::mutex> lock(this->mutex_);
      manager = this->timerManager_.lock();
      if (!repeats) {
        auto it = this->sources_.find(timerID);
        if (it != this->sources_.end()) {
          dispatch_source_cancel((__bridge dispatch_source_t)it->second);
          CFRelease(it->second);
          this->sources_.erase(it);
        }
      }
    }
    if (manager) {
      manager->callTimer(timerID);
    }
  });

  std::lock_guard<std::mutex> lock(mutex_);
  sources_[timerID] = (void *)CFBridgingRetain(source);
  dispatch_resume(source);
}

void OneMacosTimerRegistry::deleteTimer(uint32_t timerID)
{
  std::lock_guard<std::mutex> lock(mutex_);
  auto it = sources_.find(timerID);
  if (it != sources_.end()) {
    dispatch_source_cancel((__bridge dispatch_source_t)it->second);
    CFRelease(it->second);
    sources_.erase(it);
  }
}

void OneMacosTimerRegistry::quit()
{
  std::lock_guard<std::mutex> lock(mutex_);
  for (auto &entry : sources_) {
    dispatch_source_cancel((__bridge dispatch_source_t)entry.second);
    CFRelease(entry.second);
  }
  sources_.clear();
}

} // namespace facebook::react
