#import <React/RCTViewManager.h>

#import "One-Swift.h"

@interface OneZoomEnablerManager : RCTViewManager
@end

@implementation OneZoomEnablerManager

RCT_EXPORT_MODULE(OneZoomEnabler)

- (UIView *)view {
  return [ZoomTransitionEnablerView new];
}

RCT_EXPORT_VIEW_PROPERTY(zoomTransitionSourceIdentifier, NSString)
RCT_EXPORT_VIEW_PROPERTY(dismissalBoundsRect, NSDictionary)

@end
