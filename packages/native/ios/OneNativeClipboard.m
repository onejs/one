#import "OneNativeClipboard.h"

#import <UIKit/UIKit.h>

// string-only clipboard, matching expo-clipboard's string api: get/set/has
// backed by the general pasteboard.
@implementation OneNativeClipboard

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

RCT_EXPORT_METHOD(getString:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    resolve(UIPasteboard.generalPasteboard.string ?: @"");
  });
}

RCT_EXPORT_METHOD(setString:(NSString *)text
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    UIPasteboard.generalPasteboard.string = text ?: @"";
    resolve(@YES);
  });
}

RCT_EXPORT_METHOD(hasString:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    resolve(@(UIPasteboard.generalPasteboard.hasStrings));
  });
}

@end
