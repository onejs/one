#ifdef __cplusplus
#import <React/RCTViewComponentView.h>
@class OneNativeContainerSlotView;
@interface OneNativeContainerSlotComponentView : RCTViewComponentView
// the composable the parent container publishes; the React Native subtree stays here.
@property (nonatomic, readonly, strong) OneNativeContainerSlotView *slotView;
@end
#endif
