#import "OneBackgroundTasksBridge.h"
#import "OneHeadlessHost.h"
#import "One-Swift.h"
#import <React-RCTAppDelegate/RCTReactNativeFactory.h>

void OneBackgroundTasksRegisterHost(RCTReactNativeFactory *factory, NSDictionary *launchOptions) {
  [[OneBackgroundTasksCoordinator shared] registerWithStartHost:^{
    OneStartHeadlessReactHost(factory, launchOptions);
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
