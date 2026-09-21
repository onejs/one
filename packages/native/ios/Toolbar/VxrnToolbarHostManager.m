#import <React/RCTViewManager.h>

#import "VxrnNative-Swift.h"

@interface VxrnToolbarHostManager : RCTViewManager
@end

@implementation VxrnToolbarHostManager

RCT_EXPORT_MODULE(VxrnToolbarHost)

- (UIView *)view {
  return [ToolbarHostView new];
}

@end
