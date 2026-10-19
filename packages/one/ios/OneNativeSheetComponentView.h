#ifdef __cplusplus
#import <React/RCTViewComponentView.h>
@interface OneNativeSheetComponentView : RCTViewComponentView
@end
@interface OneNativeSheetContentComponentView : RCTViewComponentView
- (void)updateNativeFrame:(CGRect)frame;
- (void)setMeasuredHeightCallback:(void (^)(CGFloat height))callback;
@end
#endif
