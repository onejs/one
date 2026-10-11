#ifdef __cplusplus
#import <React/RCTViewComponentView.h>
#import "OneNativeNavigationStackComponentView.h"
@class OneNativeNavigationSplitViewView;
@class OneNativeNavigationSplitViewColumnView;
@interface OneNativeNavigationSplitViewComponentView : RCTViewComponentView
@end
@interface OneNativeNavigationSplitViewColumnComponentView : RCTViewComponentView
@property (nonatomic, readonly, strong) OneNativeNavigationSplitViewColumnView *columnView;
@end
#endif
