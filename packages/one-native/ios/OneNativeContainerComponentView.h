#ifdef __cplusplus
#import <React/RCTViewComponentView.h>
@class OneNativeContainerView;
@interface OneNativeContainerComponentView : RCTViewComponentView
// subclasses set this to the Swift container they own, and it takes the children.
@property (nonatomic, strong) OneNativeContainerView *container;
@end
#endif
