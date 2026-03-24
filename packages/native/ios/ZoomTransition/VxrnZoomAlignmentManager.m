#import <React/RCTViewManager.h>

#if __has_include("VxrnNative-Swift.h")
#import "VxrnNative-Swift.h"
#else
#import <VxrnNative/VxrnNative-Swift.h>
#endif

@interface VxrnZoomAlignmentManager : RCTViewManager
@end

@implementation VxrnZoomAlignmentManager

RCT_EXPORT_MODULE(VxrnZoomAlignment)

- (UIView *)view {
  return [ZoomTransitionAlignmentRectDetectorView new];
}

RCT_EXPORT_VIEW_PROPERTY(identifier, NSString)

@end
