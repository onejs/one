#import <React/RCTEventEmitter.h>
#import <UserNotifications/UserNotifications.h>

// event names cross the bridge to the NativeEventEmitter in index.native.ts.
static NSString *const OneNativeNotificationsReceived = @"oneNativeNotificationsReceived";
static NSString *const OneNativeNotificationsResponse = @"oneNativeNotificationsResponse";

// internal handoff from the center delegate, which outlives the bridge, to
// the module instance, which owns the bridge. a cold-start tap posts while
// no module exists yet; the response stays cached for getLastResponse.
static NSString *const OneNativeNotificationsWillPresent = @"OneNativeNotificationsWillPresent";
static NSString *const OneNativeNotificationsDidRespond = @"OneNativeNotificationsDidRespond";

// matches expo's default action identifier, re-exported from types.ts.
// categories are out of scope, so every response is a tap.
static NSString *const OneNativeNotificationsDefaultAction =
    @"expo.modules.notifications.actions.DEFAULT";

// unanswered foreground arrivals show everything after 3s, like expo: a
// stalled handler never drops a notification.
static const NSTimeInterval OneNativeNotificationsPresentTimeout = 3.0;

#pragma mark - payloads

static NSDictionary *TriggerPayload(UNNotificationTrigger *trigger)
{
  if (trigger == nil) {
    // an immediate request, matching the android immediate trigger.
    return @{@"type" : @"timeInterval", @"seconds" : @0, @"repeats" : @NO};
  }
  if ([trigger isKindOfClass:[UNTimeIntervalNotificationTrigger class]]) {
    UNTimeIntervalNotificationTrigger *timed = (UNTimeIntervalNotificationTrigger *)trigger;
    return @{
      @"type" : @"timeInterval",
      @"seconds" : @(timed.timeInterval),
      @"repeats" : @(timed.repeats),
    };
  }
  if ([trigger isKindOfClass:[UNCalendarNotificationTrigger class]]) {
    UNCalendarNotificationTrigger *dated = (UNCalendarNotificationTrigger *)trigger;
    NSDate *next = dated.nextTriggerDate ?: [NSDate date];
    return @{
      @"type" : @"date",
      @"date" : @([next timeIntervalSince1970] * 1000.0),
    };
  }
  if ([trigger isKindOfClass:[UNPushNotificationTrigger class]]) {
    return @{@"type" : @"push"};
  }
  return @{@"type" : @"unknown"};
}

static NSDictionary *ContentPayload(UNNotificationContent *content)
{
  return @{
    @"title" : content.title ?: @"",
    @"subtitle" : content.subtitle ?: [NSNull null],
    @"body" : content.body ?: @"",
    @"data" : content.userInfo ?: @{},
    @"sound" : content.sound ? @YES : @NO,
    @"badge" : content.badge ?: [NSNull null],
  };
}

static NSDictionary *NotificationPayload(UNNotification *notification)
{
  return @{
    @"request" : @{
      @"identifier" : notification.request.identifier,
      @"content" : ContentPayload(notification.request.content),
      @"trigger" : TriggerPayload(notification.request.trigger),
    },
    @"date" : @([notification.date timeIntervalSince1970] * 1000.0),
  };
}

#pragma mark - center delegate

// long-lived UNUserNotificationCenter delegate, installed at launch so a
// cold-start tap still lands. pending willPresent completions wait for the
// js handler's answer through presentNotification, or show everything after
// 3s when js stalls.
@interface OneNativeNotificationsDelegate : NSObject <UNUserNotificationCenterDelegate>
@property (nonatomic, strong) NSMutableDictionary<NSString *, id> *pendingCompletions;
@property (nonatomic, strong, nullable) NSDictionary *lastResponse;
+ (instancetype)shared;
- (void)presentRequest:(NSString *)requestId
               banner:(BOOL)banner
                 list:(BOOL)list
                sound:(BOOL)sound
                badge:(BOOL)badge;
@end

@implementation OneNativeNotificationsDelegate

+ (instancetype)shared
{
  static OneNativeNotificationsDelegate *shared;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    shared = [[OneNativeNotificationsDelegate alloc] init];
    shared.pendingCompletions = [NSMutableDictionary dictionary];
  });
  return shared;
}

- (void)userNotificationCenter:(UNUserNotificationCenter *)center
       willPresentNotification:(UNNotification *)notification
         withCompletionHandler:
             (void (^)(UNNotificationPresentationOptions))completionHandler
{
  // delegate callbacks may arrive off the main queue; everything below
  // touches the module on main.
  dispatch_async(dispatch_get_main_queue(), ^{
    NSString *requestId = [[NSUUID UUID] UUIDString];
    OneNativeNotificationsDelegate *delegate = [OneNativeNotificationsDelegate shared];
    delegate.pendingCompletions[requestId] = completionHandler;
    [[NSNotificationCenter defaultCenter]
        postNotificationName:OneNativeNotificationsWillPresent
                      object:nil
                    userInfo:@{
                      @"requestId" : requestId,
                      @"notification" : NotificationPayload(notification),
                    }];
    dispatch_after(
        dispatch_time(DISPATCH_TIME_NOW,
                      (int64_t)(OneNativeNotificationsPresentTimeout * NSEC_PER_SEC)),
        dispatch_get_main_queue(), ^{
          [delegate presentRequest:requestId banner:YES list:YES sound:YES badge:YES];
        });
  });
}

- (void)userNotificationCenter:(UNUserNotificationCenter *)center
    didReceiveNotificationResponse:(UNNotificationResponse *)response
             withCompletionHandler:(void (^)(void))completionHandler
{
  dispatch_async(dispatch_get_main_queue(), ^{
    NSString *action = response.actionIdentifier;
    if ([action isEqualToString:UNNotificationDefaultActionIdentifier]) {
      action = OneNativeNotificationsDefaultAction;
    }
    NSDictionary *payload = @{
      @"notification" : NotificationPayload(response.notification),
      @"actionIdentifier" : action,
    };
    [OneNativeNotificationsDelegate shared].lastResponse = payload;
    [[NSNotificationCenter defaultCenter] postNotificationName:OneNativeNotificationsDidRespond
                                                        object:nil
                                                      userInfo:@{@"response" : payload}];
    completionHandler();
  });
}

- (void)presentRequest:(NSString *)requestId
               banner:(BOOL)banner
                 list:(BOOL)list
                sound:(BOOL)sound
                badge:(BOOL)badge
{
  void (^completion)(UNNotificationPresentationOptions) =
      self.pendingCompletions[requestId];
  if (!completion) {
    return;
  }
  [self.pendingCompletions removeObjectForKey:requestId];
  UNNotificationPresentationOptions options = UNNotificationPresentationOptionNone;
  if (banner) {
    options |= UNNotificationPresentationOptionBanner;
  }
  if (list) {
    options |= UNNotificationPresentationOptionList;
  }
  if (sound) {
    options |= UNNotificationPresentationOptionSound;
  }
  if (badge) {
    options |= UNNotificationPresentationOptionBadge;
  }
  completion(options);
}

@end

#pragma mark - module

// local notifications: permission, badge, android channels, foreground
// presentation, received and response events, scheduling. one legacy module
// holding UNUserNotificationCenter; the android half lives in
// OneNativeNotificationsModule.kt.
@interface OneNativeNotifications : RCTEventEmitter <RCTBridgeModule>
@end

@implementation OneNativeNotifications

RCT_EXPORT_MODULE()

// installed before didFinishLaunching returns, so the delegate is in place
// when a cold-start tap response arrives. slice n3 proves the timing on
// device with a terminated-app tap.
+ (void)load
{
  [[NSNotificationCenter defaultCenter] addObserver:self
                                           selector:@selector(didFinishLaunching:)
                                               name:UIApplicationDidFinishLaunchingNotification
                                             object:nil];
}

+ (void)didFinishLaunching:(NSNotification *)note
{
  [UNUserNotificationCenter currentNotificationCenter].delegate =
      [OneNativeNotificationsDelegate shared];
}

- (instancetype)init
{
  if (self = [super init]) {
    // backstop for hosts that load the module without the launch
    // notification, without stomping another library's delegate.
    if ([UNUserNotificationCenter currentNotificationCenter].delegate == nil) {
      [UNUserNotificationCenter currentNotificationCenter].delegate =
          [OneNativeNotificationsDelegate shared];
    }
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleWillPresent:)
                                                 name:OneNativeNotificationsWillPresent
                                               object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleDidRespond:)
                                                 name:OneNativeNotificationsDidRespond
                                               object:nil];
  }
  return self;
}

- (void)dealloc
{
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[ OneNativeNotificationsReceived, OneNativeNotificationsResponse ];
}

- (void)handleWillPresent:(NSNotification *)note
{
  [self sendEventWithName:OneNativeNotificationsReceived body:note.userInfo];
}

- (void)handleDidRespond:(NSNotification *)note
{
  [self sendEventWithName:OneNativeNotificationsResponse body:note.userInfo[@"response"]];
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
                        reject(@"E_NOTIFICATIONS_PERMISSION", @"notification authorization failed",
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
          reject(@"E_NOTIFICATIONS_BADGE", @"setting the badge count failed", error);
          return;
        }
        resolve(@YES);
      }];
}

#pragma mark - events and the handler

RCT_EXPORT_METHOD(presentNotification:(NSString *)requestId
                  behavior:(NSDictionary *)behavior
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  // unknown ids resolve quietly: the completion already fired or timed out.
  [[OneNativeNotificationsDelegate shared] presentRequest:requestId
                                                   banner:[behavior[@"shouldShowBanner"] boolValue]
                                                     list:[behavior[@"shouldShowList"] boolValue]
                                                    sound:[behavior[@"shouldPlaySound"] boolValue]
                                                    badge:[behavior[@"shouldSetBadge"] boolValue]];
  resolve(nil);
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(getLastNotificationResponse)
{
  return [OneNativeNotificationsDelegate shared].lastResponse;
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(clearLastNotificationResponse)
{
  [OneNativeNotificationsDelegate shared].lastResponse = nil;
  return @YES;
}

#pragma mark - scheduling

RCT_EXPORT_METHOD(scheduleNotification:(NSDictionary *)request
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  NSDictionary *content = request[@"content"];
  if (![content isKindOfClass:[NSDictionary class]]) {
    content = @{};
  }
  UNMutableNotificationContent *nativeContent = [[UNMutableNotificationContent alloc] init];
  if ([content[@"title"] isKindOfClass:[NSString class]]) {
    nativeContent.title = content[@"title"];
  }
  if ([content[@"subtitle"] isKindOfClass:[NSString class]]) {
    nativeContent.subtitle = content[@"subtitle"];
  }
  if ([content[@"body"] isKindOfClass:[NSString class]]) {
    nativeContent.body = content[@"body"];
  }
  if ([content[@"data"] isKindOfClass:[NSDictionary class]]) {
    nativeContent.userInfo = content[@"data"];
  }
  if ([content[@"sound"] boolValue]) {
    nativeContent.sound = [UNNotificationSound defaultSound];
  }
  if (content[@"badge"] != nil && ![content[@"badge"] isKindOfClass:[NSNull class]]) {
    nativeContent.badge = content[@"badge"];
  }
  NSString *identifier = request[@"identifier"];
  if (![identifier isKindOfClass:[NSString class]]) {
    identifier = [[NSUUID UUID] UUIDString];
  }
  UNNotificationTrigger *nativeTrigger = nil;
  id trigger = request[@"trigger"];
  if ([trigger isKindOfClass:[NSDictionary class]]) {
    // channelId is android-only; ios ignores it.
    NSString *type = trigger[@"type"];
    if ([type isEqualToString:@"timeInterval"]) {
      NSTimeInterval seconds = [trigger[@"seconds"] doubleValue];
      BOOL repeats = [trigger[@"repeats"] boolValue];
      if (seconds <= 0) {
        reject(@"E_NOTIFICATIONS_TRIGGER", @"timeInterval seconds must be positive", nil);
        return;
      }
      if (repeats && seconds < 60) {
        reject(@"E_NOTIFICATIONS_TRIGGER",
               @"a repeating timeInterval must be at least 60 seconds", nil);
        return;
      }
      nativeTrigger = [UNTimeIntervalNotificationTrigger triggerWithTimeInterval:seconds
                                                                          repeats:repeats];
    } else if ([type isEqualToString:@"date"]) {
      NSTimeInterval fireMs = [trigger[@"date"] doubleValue];
      NSDate *fireDate = [NSDate dateWithTimeIntervalSince1970:fireMs / 1000.0];
      if ([fireDate timeIntervalSinceNow] > 0) {
        NSCalendar *calendar = [NSCalendar currentCalendar];
        NSDateComponents *components = [calendar
            components:(NSCalendarUnitYear | NSCalendarUnitMonth | NSCalendarUnitDay |
                        NSCalendarUnitHour | NSCalendarUnitMinute | NSCalendarUnitSecond)
              fromDate:fireDate];
        nativeTrigger = [UNCalendarNotificationTrigger triggerWithDateMatchingComponents:components
                                                                                 repeats:NO];
      }
      // a past date keeps the nil trigger and delivers immediately.
    } else {
      reject(@"E_NOTIFICATIONS_TRIGGER",
             [NSString stringWithFormat:@"unknown trigger type %@", type], nil);
      return;
    }
  }
  UNNotificationRequest *nativeRequest = [UNNotificationRequest requestWithIdentifier:identifier
                                                                               content:nativeContent
                                                                               trigger:nativeTrigger];
  [[UNUserNotificationCenter currentNotificationCenter]
      addNotificationRequest:nativeRequest
      withCompletionHandler:^(NSError *_Nullable error) {
        if (error) {
          reject(@"E_NOTIFICATIONS_SCHEDULE", @"scheduling the notification failed", error);
          return;
        }
        resolve(identifier);
      }];
}

RCT_EXPORT_METHOD(cancelScheduledNotification:(NSString *)identifier
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  [[UNUserNotificationCenter currentNotificationCenter]
      removePendingNotificationRequestsWithIdentifiers:@[ identifier ]];
  resolve(nil);
}

RCT_EXPORT_METHOD(cancelAllScheduledNotifications:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  [[UNUserNotificationCenter currentNotificationCenter] removeAllPendingNotificationRequests];
  resolve(nil);
}

RCT_EXPORT_METHOD(getAllScheduledNotifications:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  [[UNUserNotificationCenter currentNotificationCenter]
      getPendingNotificationRequestsWithCompletionHandler:^(NSArray<UNNotificationRequest *> *requests) {
        NSMutableArray *payload = [NSMutableArray arrayWithCapacity:requests.count];
        for (UNNotificationRequest *request in requests) {
          [payload addObject:@{
            @"identifier" : request.identifier,
            @"content" : ContentPayload(request.content),
            @"trigger" : TriggerPayload(request.trigger),
          }];
        }
        resolve(payload);
      }];
}

RCT_EXPORT_METHOD(getPresentedNotifications:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  [[UNUserNotificationCenter currentNotificationCenter]
      getDeliveredNotificationsWithCompletionHandler:^(NSArray<UNNotification *> *notifications) {
        NSMutableArray *payload = [NSMutableArray arrayWithCapacity:notifications.count];
        for (UNNotification *notification in notifications) {
          [payload addObject:NotificationPayload(notification)];
        }
        resolve(payload);
      }];
}

RCT_EXPORT_METHOD(dismissNotification:(NSString *)identifier
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  [[UNUserNotificationCenter currentNotificationCenter]
      removeDeliveredNotificationsWithIdentifiers:@[ identifier ]];
  resolve(nil);
}

RCT_EXPORT_METHOD(dismissAllNotifications:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  [[UNUserNotificationCenter currentNotificationCenter] removeAllDeliveredNotifications];
  resolve(nil);
}

@end
