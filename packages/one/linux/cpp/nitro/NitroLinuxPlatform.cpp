// the Linux counterparts of Nitro's ios/platform sources: logging to stderr and
// thread helpers with the GLib main thread as the UI thread

#include "NitroDefines.hpp"
#include "NitroLogger.hpp"
#include "ThreadUtils.hpp"

#include <glib.h>
#include <pthread.h>

#include <cstdio>
#include <functional>

namespace margelo::nitro {

void Logger::nativeLog([[maybe_unused]] LogLevel level,
                       [[maybe_unused]] const char* NON_NULL tag,
                       [[maybe_unused]] const std::string& message) {
#ifdef NITRO_DEBUG
  std::fprintf(stderr, "[nitro] [%s] %s\n", tag, message.c_str());
#endif
}

namespace {

class MainContextDispatcher final : public Dispatcher {
public:
  void runSync(std::function<void()>&&) override {
    throw std::runtime_error("MainContextDispatcher::runSync() is not implemented!");
  }

  void runAsync(std::function<void()>&& function) override {
    auto* heap = new std::function<void()>(std::move(function));
    g_idle_add_full(
        G_PRIORITY_DEFAULT,
        [](gpointer data) -> gboolean {
          auto* call = static_cast<std::function<void()>*>(data);
          (*call)();
          return G_SOURCE_REMOVE;
        },
        heap, [](gpointer data) { delete static_cast<std::function<void()>*>(data); });
  }
};

} // namespace

std::string ThreadUtils::getThreadName() {
  char threadName[64] = {};
  if (pthread_getname_np(pthread_self(), threadName, sizeof(threadName)) == 0 && threadName[0] != '\0') {
    return std::string(threadName);
  }
  return "unnamed thread";
}

void ThreadUtils::setThreadName(const std::string& name) {
  pthread_setname_np(pthread_self(), name.substr(0, 15).c_str());
}

bool ThreadUtils::isUIThread() {
  return g_main_context_is_owner(g_main_context_default());
}

std::shared_ptr<Dispatcher> ThreadUtils::createUIThreadDispatcher() {
  return std::make_shared<MainContextDispatcher>();
}

} // namespace margelo::nitro
