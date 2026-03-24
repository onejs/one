#import <React/RCTViewManager.h>

#if __has_include("VxrnNative-Swift.h")
#import "VxrnNative-Swift.h"
#else
#import <VxrnNative/VxrnNative-Swift.h>
#endif

@interface VxrnToolbarHostManager : RCTViewManager
@end

@implementation VxrnToolbarHostManager

RCT_EXPORT_MODULE(VxrnToolbarHost)

- (UIView *)view {
  return [ToolbarHostView new];
}

@end
