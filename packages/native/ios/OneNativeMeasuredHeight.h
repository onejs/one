#ifdef __cplusplus
#import <UIKit/UIKit.h>
#import <react/renderer/core/State.h>
// one definition of how a height SwiftUI measured reaches Yoga. containers own one through
// OneNativeMeasuredComponentView; generated controls own one directly.
@interface OneNativeMeasuredHeight : NSObject
- (void)adopt:(facebook::react::State::Shared const &)state;
- (void)update:(CGFloat)height;
- (void)reset;
@end
#endif
