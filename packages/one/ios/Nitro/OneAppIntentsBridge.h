#import <Foundation/Foundation.h>

@class RCTReactNativeFactory;

FOUNDATION_EXPORT void OneAppIntentsRegisterHost(
  RCTReactNativeFactory *factory,
  NSDictionary *_Nullable launchOptions
);

FOUNDATION_EXPORT void OneAppIntentsPerform(
  NSString *identifier,
  NSString *_Nullable text,
  void (^completion)(NSString *_Nullable result, NSError *_Nullable error)
);
