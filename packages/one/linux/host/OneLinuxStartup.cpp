#include "OneLinuxStartup.h"

#include <time.h>
#include <unistd.h>

#include <cstdio>
#include <cstdlib>
#include <fstream>
#include <iterator>
#include <string>

namespace {

// ms since boot at which this process started, from field 22 of /proc/self/stat
double processStartMs()
{
  std::ifstream stat("/proc/self/stat");
  std::string contents((std::istreambuf_iterator<char>(stat)), std::istreambuf_iterator<char>());
  // the command name in parentheses may hold spaces; fields count from after it
  size_t close = contents.rfind(')');
  size_t position = close + 2;
  for (int field = 3; field < 22; field++) {
    position = contents.find(' ', position) + 1;
  }
  return std::stod(contents.substr(position)) * 1000.0 / sysconf(_SC_CLK_TCK);
}

} // namespace

void OneLinuxStartupMark(const char *label)
{
  static const bool enabled = std::getenv("ONE_LINUX_STARTUP_LOG") != nullptr;
  if (!enabled) {
    return;
  }
  static const double start = processStartMs();
  timespec now;
  clock_gettime(CLOCK_BOOTTIME, &now);
  double nowMs = now.tv_sec * 1000.0 + now.tv_nsec / 1e6;
  std::fprintf(stderr, "[one-linux] startup %7.1f ms  %s\n", nowMs - start, label);
}
