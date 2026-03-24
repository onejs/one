#import <React/RCTViewManager.h>

#if __has_include("VxrnNative-Swift.h")
#import "VxrnNative-Swift.h"
#else
#import <VxrnNative/VxrnNative-Swift.h>
#endif

@interface VxrnZoomSourceManager : RCTViewManager
@end

@implementation VxrnZoomSourceManager

RCT_EXPORT_MODULE(VxrnZoomSource)

- (UIView *)view {
  return [ZoomTransitionSourceView new];
}

RCT_EXPORT_VIEW_PROPERTY(identifier, NSString)
RCT_EXPORT_VIEW_PROPERTY(alignment, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(animateAspectRatioChange, BOOL)

@end
