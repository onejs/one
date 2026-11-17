#import "OneNativeSafeAreaContext.h"

#import <React/RCTUtils.h>
#import <UIKit/UIKit.h>

// synchronous initial window metrics for getInitialWindowMetrics, mirroring
// upstream RNCSafeAreaContext: the key window's safeAreaInsets and frame,
// read on the main queue. a legacy constants module, like the package's
// other native modules; TurboModuleRegistry.get falls back to it.
@implementation OneNativeSafeAreaContext

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (NSDictionary *)constantsToExport
{
  return [self getConstants];
}

- (NSDictionary *)getConstants
{
  __block NSDictionary *constants;

  RCTUnsafeExecuteOnMainQueueSync(^{
    UIWindow *window = RCTKeyWindow();
    if (window == nil) {
      constants = @{@"initialWindowMetrics" : [NSNull null]};
      return;
    }

    UIEdgeInsets safeAreaInsets = window.safeAreaInsets;
    CGFloat cornerRadius = 0;
    if (@available(iOS 26.0, *)) {
      // a probe over the whole window resolves to the display's own corner
      UIView *probe = [[UIView alloc] initWithFrame:window.bounds];
      probe.hidden = YES;
      probe.cornerConfiguration =
          [UICornerConfiguration configurationWithRadius:[UICornerRadius containerConcentricRadius]];
      [window addSubview:probe];
      cornerRadius = [probe effectiveRadiusForCorner:UIRectCornerTopLeft];
      [probe removeFromSuperview];
    }

    constants = @{
      @"initialWindowMetrics" : @{
        @"insets" : @{
          @"top" : @(safeAreaInsets.top),
          @"right" : @(safeAreaInsets.right),
          @"bottom" : @(safeAreaInsets.bottom),
          @"left" : @(safeAreaInsets.left),
        },
        @"frame" : @{
          @"x" : @(window.frame.origin.x),
          @"y" : @(window.frame.origin.y),
          @"width" : @(window.frame.size.width),
          @"height" : @(window.frame.size.height),
        },
        @"cornerRadius" : @(cornerRadius),
      }
    };
  });

  return constants;
}

@end
