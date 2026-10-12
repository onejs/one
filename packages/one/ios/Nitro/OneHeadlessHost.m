#import "OneHeadlessHost.h"
#import <React-RCTAppDelegate/RCTReactNativeFactory.h>
#import <React-RCTAppDelegate/RCTRootViewFactory.h>

void OneStartHeadlessReactHost(RCTReactNativeFactory *factory, NSDictionary *launchOptions) {
  // background tasks and app intents share the same idempotent react host.
  [factory.rootViewFactory initializeReactHostWithLaunchOptions:launchOptions
                                            bundleConfiguration:factory.bundleConfiguration
                                           devMenuConfiguration:factory.devMenuConfiguration];
}
