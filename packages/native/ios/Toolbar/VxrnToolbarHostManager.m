#import <React/RCTViewManager.h>

#import "VxrnNative-Swift.h"

@interface VxrnToolbarHostManager : RCTViewManager
@end

@implementation VxrnToolbarHostManager

RCT_EXPORT_MODULE(VxrnToolbarHost)

- (UIView *)view {
  return [ToolbarHostView new];
}

RCT_REMAP_VIEW_PROPERTY(hidden, toolbarHidden, BOOL)
RCT_EXPORT_VIEW_PROPERTY(animated, BOOL)

@end
