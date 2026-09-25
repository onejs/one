#import <UIKit/UIKit.h>

#import "One-Swift.h"

// swift cannot define +load, so this installs OneNotificationsCenter as the
// UNUserNotificationCenter delegate at didFinishLaunching, before a
// cold-start tap response can arrive. apps without the Info.plist opt-in
// keep whatever delegate their own push library sets.
@interface OneNotificationsLaunch : NSObject
@end

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
                                                }];
}

@end
