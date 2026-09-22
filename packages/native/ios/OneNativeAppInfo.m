#import "OneNativeAppInfo.h"

// installed-binary identity for One.AppInfo: the user-visible version, the
// binary build, and the install identity, read synchronously from the main
// bundle's info dictionary. a legacy constants module, like the package's
// other native modules; TurboModuleRegistry.get falls back to it.
// infoDictionary is thread-safe, so no main-queue setup is needed.
@implementation OneNativeAppInfo

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (NSDictionary *)constantsToExport
{
  return [self getConstants];
}

- (NSDictionary *)getConstants
{
  NSDictionary *info = NSBundle.mainBundle.infoDictionary;
  id version = info[@"CFBundleShortVersionString"];
  id build = info[@"CFBundleVersion"];
  id applicationId = info[@"CFBundleIdentifier"];
  return @{
    @"version" : version ?: [NSNull null],
    @"build" : build ?: [NSNull null],
    @"applicationId" : applicationId ?: [NSNull null],
  };
}

@end
