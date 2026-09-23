#import "OneNativeAdaptive.h"
#import <React/RCTUtils.h>
#import "VxrnNative-Swift.h"

@implementation OneNativeAdaptive {
  BOOL _hasListeners;
}

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[
    @"oneNativeSizeClassDidChange",
    @"oneNativeHingeDidChange",
    @"oneNativeReservedRegionsDidChange"
  ];
}

- (NSDictionary *)constantsToExport
{
  return [self getConstants];
}

- (NSDictionary *)getConstants
{
  __block NSDictionary *constants;
  RCTUnsafeExecuteOnMainQueueSync(^{
    OneNativeAdaptiveBridge *bridge = [OneNativeAdaptiveBridge shared];
    NSDictionary *sizeClass = [bridge getSizeClass];
    NSDictionary *hinge = [bridge getHinge];
    NSArray *regions = [bridge getReservedRegionsWithIncludeInactive:NO];
    constants = @{
      @"initialSizeClass": sizeClass ?: @{@"horizontal": @"unspecified", @"vertical": @"unspecified"},
      @"initialHinge": hinge ?: [NSNull null],
      @"initialReservedRegions": regions ?: @[]
    };
  });
  return constants;
}

- (void)startObserving
{
  _hasListeners = YES;
  __weak typeof(self) weakSelf = self;
  dispatch_async(dispatch_get_main_queue(), ^{
    OneNativeAdaptiveBridge *bridge = [OneNativeAdaptiveBridge shared];
    bridge.onSizeClass = ^(NSString *h, NSString *v) {
      OneNativeAdaptive *strongSelf = weakSelf;
      if (strongSelf && strongSelf->_hasListeners) {
        [strongSelf sendEventWithName:@"oneNativeSizeClassDidChange" body:@{
          @"horizontal": h,
          @"vertical": v
        }];
      }
    };
    bridge.onHinge = ^(NSString *status, double angle) {
      OneNativeAdaptive *strongSelf = weakSelf;
      if (strongSelf && strongSelf->_hasListeners) {
        [strongSelf sendEventWithName:@"oneNativeHingeDidChange" body:@{
          @"status": status,
          @"angle": @(angle)
        }];
      }
    };
    bridge.onReservedRegions = ^(NSArray<NSDictionary *> *regions) {
      OneNativeAdaptive *strongSelf = weakSelf;
      if (strongSelf && strongSelf->_hasListeners) {
        [strongSelf sendEventWithName:@"oneNativeReservedRegionsDidChange" body:regions];
      }
    };
    [bridge startObserving];
  });
}

- (void)stopObserving
{
  _hasListeners = NO;
  dispatch_async(dispatch_get_main_queue(), ^{
    [[OneNativeAdaptiveBridge shared] stopObserving];
  });
}

RCT_EXPORT_METHOD(getSizeClass:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    resolve([[OneNativeAdaptiveBridge shared] getSizeClass]);
  });
}

RCT_EXPORT_METHOD(getHinge:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    id hinge = [[OneNativeAdaptiveBridge shared] getHinge];
    resolve(hinge ?: [NSNull null]);
  });
}

RCT_EXPORT_METHOD(getReservedRegions:(BOOL)includeInactive resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    resolve([[OneNativeAdaptiveBridge shared] getReservedRegionsWithIncludeInactive:includeInactive]);
  });
}

@end
