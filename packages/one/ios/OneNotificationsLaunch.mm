#import <UIKit/UIKit.h>
#import <objc/runtime.h>

#import "One-Swift.h"

// swift cannot define +load, so this installs OneNotificationsCenter as the
// UNUserNotificationCenter delegate at didFinishLaunching, before a
// cold-start tap response can arrive. apps without the Info.plist opt-in
// keep whatever delegate their own push library sets.
@interface OneNotificationsLaunch : NSObject
@end

// wraps an app delegate method so one sees the call first, then the host's
// own implementation (inherited or not) still runs. a class without the
// method gains it, so the push token reaches one in every host, one prebuild
// or expo, with no app delegate code.
static void OneNotificationsHook(Class cls, SEL selector, id block)
{
  Method existing = class_getInstanceMethod(cls, selector);
  IMP original = existing ? method_getImplementation(existing) : NULL;
  void (^before)(id, UIApplication *, id) = block;
  IMP hooked = imp_implementationWithBlock(^(id delegate, UIApplication *application, id value) {
    before(delegate, application, value);
    if (original) {
      ((void (*)(id, SEL, UIApplication *, id))original)(delegate, selector, application, value);
    }
  });
  if (!class_addMethod(cls, selector, hooked, "v@:@@")) {
    method_setImplementation(existing, hooked);
  }
}

@implementation OneNotificationsLaunch

+ (void)load
{
  if (![OneNotificationsCenter notificationsEnabled]) {
    return;
  }
  [[NSNotificationCenter defaultCenter] addObserverForName:UIApplicationDidFinishLaunchingNotification
                                                    object:nil
                                                     queue:nil
                                                usingBlock:^(NSNotification *note) {
                                                  [OneNotificationsCenter install];
                                                  Class delegateClass = [[UIApplication sharedApplication].delegate class];
                                                  if (!delegateClass) {
                                                    return;
                                                  }
                                                  OneNotificationsHook(
                                                      delegateClass,
                                                      @selector(application:didRegisterForRemoteNotificationsWithDeviceToken:),
                                                      ^(id delegate, UIApplication *application, NSData *deviceToken) {
                                                        [OneNotificationsCenter didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
                                                      });
                                                  OneNotificationsHook(
                                                      delegateClass,
                                                      @selector(application:didFailToRegisterForRemoteNotificationsWithError:),
                                                      ^(id delegate, UIApplication *application, NSError *error) {
                                                        [OneNotificationsCenter didFailToRegisterForRemoteNotificationsWithError:error];
                                                      });
                                                }];
}

@end
