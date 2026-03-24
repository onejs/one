#import <React/RCTViewManager.h>

#if __has_include("VxrnNative-Swift.h")
#import "VxrnNative-Swift.h"
#else
#import <VxrnNative/VxrnNative-Swift.h>
#endif

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
