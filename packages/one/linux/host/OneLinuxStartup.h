#pragma once

#include <gtk/gtk.h>

// Startup timeline for the Linux host. Marks print to stderr, relative to the
// process start the kernel recorded, only when ONE_LINUX_STARTUP_LOG is set.
void OneLinuxStartupMark(const char *label);

void OneLinuxStartupContentPainted(GdkFrameClock *clock);
