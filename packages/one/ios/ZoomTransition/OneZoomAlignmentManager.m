#import <React/RCTViewManager.h>

#import "One-Swift.h"

@interface OneZoomAlignmentManager : RCTViewManager
@end

@implementation OneZoomAlignmentManager

RCT_EXPORT_MODULE(OneZoomAlignment)

- (UIView *)view {
  return [ZoomTransitionAlignmentRectDetectorView new];
}

RCT_EXPORT_VIEW_PROPERTY(identifier, NSString)

@end
