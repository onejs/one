#ifdef __cplusplus
#import "OneNativeContainerComponentView.h"
#import <React/RCTViewComponentView.h>
@class OneNativeToolbarView;
@interface OneNativeNavigationStackComponentView : RCTViewComponentView
@end
@interface OneNativeNavigationStackContentComponentView : RCTViewComponentView
- (void)updateNativeFrame:(CGRect)frame;
@end
@interface OneNativeToolbarComponentView : OneNativeContainerComponentView
@property (nonatomic, readonly, strong) OneNativeToolbarView *toolbarView;
@end
@interface OneNativeToolbarItemComponentView : OneNativeContainerComponentView
@end
@interface OneNativeToolbarItemGroupComponentView : OneNativeContainerComponentView
@end
@interface OneNativeToolbarSpacerComponentView : OneNativeContainerComponentView
@end
#endif
