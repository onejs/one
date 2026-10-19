#ifdef __cplusplus
#import <React/RCTViewComponentView.h>
@class OneNativeContainerView;
@interface OneNativeContainerComponentView : RCTViewComponentView
// subclasses set this to the Swift container they own, and it takes the children.
@property (nonatomic, strong) OneNativeContainerView *container;
// the emitter Fabric attached to this view, for the container's forwarded events.
- (std::shared_ptr<const facebook::react::ViewEventEmitter>)currentEventEmitter;
@end
#endif
