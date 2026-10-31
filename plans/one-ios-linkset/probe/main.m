#import <UIKit/UIKit.h>
#include <stdio.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/time.h>
#include <sys/sysctl.h>
static void mark(const char *name) {
  struct kinfo_proc info; size_t size = sizeof(info); int mib[4] = {CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()};
  sysctl(mib, 4, &info, &size, NULL, 0);
  struct timeval s = info.kp_proc.p_un.__p_starttime, now; gettimeofday(&now, NULL);
  double ms = (now.tv_sec - s.tv_sec) * 1000.0 + (now.tv_usec - s.tv_usec) / 1000.0;
  char line[128]; int n = snprintf(line, sizeof line, "%s %.2f\n", name, ms);
  const char *p = getenv("PROBE_TRACE"); if (!p) p = "/private/tmp/probe-trace.log";
  int fd = open(p, O_WRONLY | O_APPEND | O_CREAT, 0644); if (fd >= 0) { write(fd, line, n); close(fd); }
}
__attribute__((constructor)) static void ctor(void) { mark("ctor"); }
int main(int argc, char **argv) { mark("main"); return 0; }
