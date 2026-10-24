#include "OneLinuxRuntime.h"

namespace facebook::react {

OneLinuxMessageQueueThread::OneLinuxMessageQueueThread() : thread_([this] { run(); }) {}

OneLinuxMessageQueueThread::~OneLinuxMessageQueueThread()
{
  quitSynchronous();
}

bool OneLinuxMessageQueueThread::isOnThread() const
{
  return std::this_thread::get_id() == thread_.get_id();
}

void OneLinuxMessageQueueThread::runOnQueue(std::function<void()> &&work)
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

void OneLinuxMessageQueueThread::quitSynchronous()
{
  {
    std::lock_guard<std::mutex> lock(mutex_);
    if (quit_) {
      return;
    }
    quit_ = true;
  }
  wake_.notify_one();
  if (!isOnThread()) {
    thread_.join();
  }
}

void OneLinuxMessageQueueThread::run()
{
  pthread_setname_np(pthread_self(), "one-javascript");
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

namespace {

struct TimerData {
  OneLinuxTimerRegistry *registry;
  std::function<void()> fire;
};

} // namespace

OneLinuxTimerRegistry::~OneLinuxTimerRegistry()
{
  disarmAll();
}

void OneLinuxTimerRegistry::arm(uint32_t timerID, double delayMS, bool repeats)
{
  GSource *source = g_timeout_source_new(static_cast<guint>(std::max(delayMS, 1.0)));
  auto *fire = new std::function<void()>([this, timerID, repeats] { this->fire(timerID, repeats); });
  g_source_set_callback(
      source,
      [](gpointer data) -> gboolean {
        (*static_cast<std::function<void()> *>(data))();
        return G_SOURCE_CONTINUE;
      },
      fire,
      [](gpointer data) { delete static_cast<std::function<void()> *>(data); });

  std::lock_guard<std::mutex> lock(mutex_);
  auto existing = sources_.find(timerID);
  if (existing != sources_.end()) {
    g_source_destroy(existing->second);
    g_source_unref(existing->second);
  }
  sources_[timerID] = source;
  g_source_attach(source, nullptr);
}

void OneLinuxTimerRegistry::disarm(uint32_t timerID)
{
  std::lock_guard<std::mutex> lock(mutex_);
  auto it = sources_.find(timerID);
  if (it != sources_.end()) {
    g_source_destroy(it->second);
    g_source_unref(it->second);
    sources_.erase(it);
  }
}

void OneLinuxTimerRegistry::disarmAll()
{
  std::lock_guard<std::mutex> lock(mutex_);
  for (auto &entry : sources_) {
    g_source_destroy(entry.second);
    g_source_unref(entry.second);
  }
  sources_.clear();
}

namespace {

struct ObserverSource {
  GSource base;
  const OneLinuxRunLoopObserver *observer;
};

gboolean observerPrepare(GSource *source, gint *timeout)
{
  *timeout = -1;
  static_cast<ObserverSource *>(static_cast<void *>(source))->observer->tick();
  return FALSE;
}

gboolean observerCheck(GSource *)
{
  return FALSE;
}

gboolean observerDispatch(GSource *, GSourceFunc, gpointer)
{
  return G_SOURCE_CONTINUE;
}

GSourceFuncs observerFuncs = {observerPrepare, observerCheck, observerDispatch, nullptr, nullptr, nullptr};

} // namespace

OneLinuxRunLoopObserver::OneLinuxRunLoopObserver(Activity activities, WeakOwner owner)
    : RunLoopObserver(activities, std::move(owner))
{
}

OneLinuxRunLoopObserver::~OneLinuxRunLoopObserver() noexcept
{
  stopObserving();
}

bool OneLinuxRunLoopObserver::isOnRunLoopThread() const noexcept
{
  return g_main_context_is_owner(g_main_context_default());
}

void OneLinuxRunLoopObserver::tick() const noexcept
{
  if (auto strongOwner = owner_.lock()) {
    activityDidChange(BeforeWaiting);
  }
}

void OneLinuxRunLoopObserver::startObserving() const noexcept
{
  std::lock_guard<std::mutex> lock(mutex_);
  if (source_) {
    return;
  }
  source_ = g_source_new(&observerFuncs, sizeof(ObserverSource));
  reinterpret_cast<ObserverSource *>(source_)->observer = this;
  g_source_attach(source_, nullptr);
}

void OneLinuxRunLoopObserver::stopObserving() const noexcept
{
  std::lock_guard<std::mutex> lock(mutex_);
  if (source_) {
    g_source_destroy(source_);
    g_source_unref(source_);
    source_ = nullptr;
  }
}

void OneLinuxDispatchMain(std::function<void()> work)
{
  g_idle_add_full(
      G_PRIORITY_DEFAULT,
      [](gpointer data) -> gboolean {
        auto *work = static_cast<std::function<void()> *>(data);
        (*work)();
        return G_SOURCE_REMOVE;
      },
      new std::function<void()>(std::move(work)),
      [](gpointer data) { delete static_cast<std::function<void()> *>(data); });
}

} // namespace facebook::react
