#import <Foundation/Foundation.h>

@class RCTReactNativeFactory;

FOUNDATION_EXPORT void OneBackgroundTasksRegisterHost(
  RCTReactNativeFactory *factory,
  NSDictionary *_Nullable launchOptions
);

#if DEBUG
// debug-only URL proof hooks never ship in release builds.
FOUNDATION_EXPORT void OneBackgroundTasksSimulateLaunch(NSString *identifier);
FOUNDATION_EXPORT void OneBackgroundTasksSimulateExpiration(void);
#endif
