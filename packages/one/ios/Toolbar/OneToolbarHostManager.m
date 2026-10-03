#import <React/RCTViewManager.h>

#import "One-Swift.h"

@interface OneToolbarHostManager : RCTViewManager
@end

@implementation OneToolbarHostManager

RCT_EXPORT_MODULE(OneToolbarHost)

- (UIView *)view {
  return [ToolbarHostView new];
}

RCT_REMAP_VIEW_PROPERTY(hidden, toolbarHidden, BOOL)
RCT_EXPORT_VIEW_PROPERTY(animated, BOOL)

@end
