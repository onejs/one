#import "OneUpdatesLauncherBridge.h"
#import "One-Swift.h"

NSURL *_Nullable OneUpdatesBundleURL(void) {
  return [OneUpdatesLauncher bundleURL];
}

NSURL *_Nullable OneUpdatesLaunchingBundleURL(void) {
  return [OneUpdatesLauncher launchingURL];
}
