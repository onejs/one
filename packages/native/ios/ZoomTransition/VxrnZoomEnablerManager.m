#import <React/RCTViewManager.h>

#import "VxrnNative-Swift.h"

@interface VxrnZoomEnablerManager : RCTViewManager
@end

@implementation VxrnZoomEnablerManager

RCT_EXPORT_MODULE(VxrnZoomEnabler)

- (UIView *)view {
  return [ZoomTransitionEnablerView new];
}

RCT_EXPORT_VIEW_PROPERTY(zoomTransitionSourceIdentifier, NSString)
RCT_EXPORT_VIEW_PROPERTY(dismissalBoundsRect, NSDictionary)

@end
