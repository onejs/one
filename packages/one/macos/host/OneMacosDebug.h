#import <AppKit/AppKit.h>

// Debug builds only. With ONE_MACOS_DEBUG_DIR set, SIGUSR1 writes a png of the
// window content into it and SIGUSR2 sends a click to the first toggle, for
// driving the app where screen capture and accessibility are not granted.
void OneMacosInstallDebugHooks(NSView *rootView);
