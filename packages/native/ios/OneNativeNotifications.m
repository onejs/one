#import <React/RCTBridgeModule.h>
#import <UserNotifications/UserNotifications.h>

// local notifications: permission, badge, android channels, foreground
// presentation, received and response events, scheduling. one legacy module
// holding UNUserNotificationCenter; the android half lives in
// OneNativeNotificationsModule.kt.
@interface OneNativeNotifications : NSObject <RCTBridgeModule>
@end

@implementation OneNativeNotifications

RCT_EXPORT_MODULE()

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

#pragma mark - permission and badge

// unauthorizationstatus 0 not determined, 1 denied, 2 authorized,
// 3 provisional, 4 ephemeral. provisional and ephemeral count as granted:
// the system delivers to those apps.
- (NSDictionary *)permissionPayload:(UNAuthorizationStatus)status
{
  NSString *mapped;
  BOOL granted;
  BOOL canAskAgain;
  switch (status) {
    case UNAuthorizationStatusNotDetermined:
      mapped = @"undetermined";
      granted = NO;
      canAskAgain = YES;
      break;
    case UNAuthorizationStatusDenied:
      mapped = @"denied";
      granted = NO;
      canAskAgain = NO;
      break;
    default:
      mapped = @"granted";
      granted = YES;
      canAskAgain = NO;
      break;
  }
  return @{
    @"status" : mapped,
    @"granted" : @(granted),
    @"canAskAgain" : @(canAskAgain),
    @"ios" : @{@"status" : @(status)},
  };
}

RCT_EXPORT_METHOD(getPermissions:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  [[UNUserNotificationCenter currentNotificationCenter]
      getNotificationSettingsWithCompletionHandler:^(UNNotificationSettings *settings) {
        resolve([self permissionPayload:settings.authorizationStatus]);
      }];
}

RCT_EXPORT_METHOD(requestPermissions:(NSDictionary *)options
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  // unset fields default to yes, except provisional which defaults to no.
  NSDictionary *ios = options[@"ios"];
  if (![ios isKindOfClass:[NSDictionary class]]) {
    ios = @{};
  }
  UNAuthorizationOptions authOptions = 0;
  if (ios[@"allowAlert"] == nil || [ios[@"allowAlert"] boolValue]) {
    authOptions |= UNAuthorizationOptionAlert;
  }
  if (ios[@"allowBadge"] == nil || [ios[@"allowBadge"] boolValue]) {
    authOptions |= UNAuthorizationOptionBadge;
  }
  if (ios[@"allowSound"] == nil || [ios[@"allowSound"] boolValue]) {
    authOptions |= UNAuthorizationOptionSound;
  }
  if ([ios[@"allowProvisional"] boolValue]) {
    authOptions |= UNAuthorizationOptionProvisional;
  }
  [[UNUserNotificationCenter currentNotificationCenter]
      requestAuthorizationWithOptions:authOptions
                    completionHandler:^(BOOL granted, NSError *_Nullable error) {
                      if (error) {
                        reject(@"E_PERMISSIONS", @"notification authorization failed",
                               error);
                        return;
                      }
                      [[UNUserNotificationCenter currentNotificationCenter]
                          getNotificationSettingsWithCompletionHandler:^(
                              UNNotificationSettings *settings) {
                            resolve([self permissionPayload:settings.authorizationStatus]);
                          }];
                    }];
}

RCT_EXPORT_METHOD(getBadgeCount:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  // the only getter: UNUserNotificationCenter exposes just the setter, and
  // this property is deprecated since ios 17 but still reads correctly.
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
  NSInteger count = [UIApplication sharedApplication].applicationIconBadgeNumber;
#pragma clang diagnostic pop
  resolve(@(count));
}

RCT_EXPORT_METHOD(setBadgeCount:(double)count
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  // ios 16+, and the package floor is 17.
  [[UNUserNotificationCenter currentNotificationCenter]
      setBadgeCount:(NSInteger)count
      withCompletionHandler:^(NSError *_Nullable error) {
        if (error) {
          reject(@"E_BADGE", @"setting the badge count failed", error);
          return;
        }
        resolve(@YES);
      }];
}

@end
