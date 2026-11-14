#include <errno.h>
#include <inttypes.h>
#include <libproc.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/resource.h>

int main(int argc, char **argv) {
  if (argc != 2) return 2;
  char *end;
  errno = 0;
  long pid = strtol(argv[1], &end, 10);
  if (errno || *end || pid <= 0 || pid > INT_MAX) return 2;
  struct rusage_info_v4 usage = {0};
  if (proc_pid_rusage((int)pid, RUSAGE_INFO_V4, (rusage_info_t *)&usage)) {
    perror("proc_pid_rusage");
    return 1;
  }
  printf("{\"pid\":%ld,\"physicalFootprintBytes\":%" PRIu64 ",\"residentBytes\":%" PRIu64 "}\n",
         pid, usage.ri_phys_footprint, usage.ri_resident_size);
  return 0;
}
