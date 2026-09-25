#import <React/RCTViewManager.h>

#import "One-Swift.h"

@interface OneZoomSourceManager : RCTViewManager
@end

@implementation OneZoomSourceManager

RCT_EXPORT_MODULE(OneZoomSource)

- (UIView *)view {
  return [ZoomTransitionSourceView new];
}

RCT_EXPORT_VIEW_PROPERTY(identifier, NSString)
RCT_EXPORT_VIEW_PROPERTY(alignment, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(animateAspectRatioChange, BOOL)

@end
