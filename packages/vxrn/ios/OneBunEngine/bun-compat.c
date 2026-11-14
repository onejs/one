// BunCompat: what the iOS SDK lacks for a runtime built against macOS, and the
// compiled program in __TEXT,__bun, added when the app builds
#include <TargetConditionals.h>
#include <libkern/OSCacheControl.h>
#include <mach-o/ldsyms.h>

void __clear_cache(void *start, void *end) { sys_icache_invalidate(start, (char *)end - (char *)start); }

// the AoT loader checks the program against the segments of the executable,
// which in an app is this image
const struct mach_header *_NSGetMachExecuteHeader(void) { return (const struct mach_header *)&_mh_dylib_header; }

#if !TARGET_OS_SIMULATOR
void pthread_jit_write_protect_np(int enabled) { (void)enabled; __builtin_trap(); }
#endif
