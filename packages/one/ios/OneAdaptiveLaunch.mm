#import <UIKit/UIKit.h>

#import "One-Swift.h"

// swift cannot define +load, so this starts OneHingeMonitor when the first
// app window becomes key. the hinge then reaches the monitor on the next run
// loop turn, long before js imports one, so the synchronous seed reads it.
@interface OneAdaptiveLaunch : NSObject
@end

@implementation OneAdaptiveLaunch

+ (void)load
{
  __block id observer = [[NSNotificationCenter defaultCenter] addObserverForName:UIWindowDidBecomeKeyNotification
                                                                          object:nil
                                                                           queue:[NSOperationQueue mainQueue]
                                                                      usingBlock:^(NSNotification *note) {
    [[NSNotificationCenter defaultCenter] removeObserver:observer];
    observer = nil;
    [OneHingeMonitor start];
  }];
}

@end
