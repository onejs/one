#ifdef __cplusplus
#import "OneNativeContainerComponentView.h"
@interface OneNativeMeasuredComponentView : OneNativeContainerComponentView
// subclasses report the height SwiftUI measured; it reaches Yoga through Fabric state.
- (void)updateMeasuredHeight:(CGFloat)height;
@end
#endif
