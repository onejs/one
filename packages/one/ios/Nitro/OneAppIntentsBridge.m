#import "OneAppIntentsBridge.h"
#import "OneHeadlessHost.h"
#import "One-Swift.h"
#import <React-RCTAppDelegate/RCTReactNativeFactory.h>

void OneAppIntentsRegisterHost(RCTReactNativeFactory *factory, NSDictionary *launchOptions) {
  [[OneAppIntentsCoordinator shared] registerWithStartHost:^{
    OneStartHeadlessReactHost(factory, launchOptions);
  }];
}

void OneAppIntentsPerform(NSString *identifier, NSString *text,
                          void (^completion)(NSString *, NSError *)) {
  [[OneAppIntentsCoordinator shared] performWithIdentifier:identifier
                                                      text:text
                                                completion:completion];
}
