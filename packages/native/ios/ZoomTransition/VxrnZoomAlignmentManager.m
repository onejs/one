#import <React/RCTViewManager.h>

#import "VxrnNative-Swift.h"

@interface VxrnZoomAlignmentManager : RCTViewManager
@end

@implementation VxrnZoomAlignmentManager

RCT_EXPORT_MODULE(VxrnZoomAlignment)

- (UIView *)view {
  return [ZoomTransitionAlignmentRectDetectorView new];
}

RCT_EXPORT_VIEW_PROPERTY(identifier, NSString)

@end
