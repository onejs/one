#import "OneBackgroundTasksBridge.h"
#import "One-Swift.h"
#import <React-RCTAppDelegate/RCTReactNativeFactory.h>
#import <React-RCTAppDelegate/RCTRootViewFactory.h>

void OneBackgroundTasksRegisterHost(RCTReactNativeFactory *factory, NSDictionary *launchOptions) {
  [[OneBackgroundTasksCoordinator shared] registerWithStartHost:^{
    [factory.rootViewFactory initializeReactHostWithLaunchOptions:launchOptions
                                              bundleConfiguration:factory.bundleConfiguration
                                             devMenuConfiguration:factory.devMenuConfiguration];
  }];
}

#if DEBUG
void OneBackgroundTasksSimulateLaunch(NSString *identifier) {
  [[OneBackgroundTasksCoordinator shared] simulateLaunchWithIdentifier:identifier];
}

void OneBackgroundTasksSimulateExpiration(void) {
  [[OneBackgroundTasksCoordinator shared] simulateExpiration];
}
#endif
