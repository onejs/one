#import <React/RCTViewComponentView.h>
@class OneNativePortalHostViewComponentView;
@interface OneNativePortalViewComponentView : RCTViewComponentView
@property(nonatomic, copy) NSString *hostName;
@property(nonatomic, copy) NSString *portalName;
@property(nonatomic, readonly) NSArray<UIView *> *portalChildren;
- (void)refreshTarget;
- (void)publishLayout;
@end
@interface OneNativePortalHostViewComponentView : RCTViewComponentView
@property(nonatomic, copy) NSString *hostName;
@end
@interface OneNativePortalRegistry : NSObject
+ (instancetype)shared;
- (void)addPortal:(OneNativePortalViewComponentView *)portal;
- (void)removePortal:(OneNativePortalViewComponentView *)portal;
- (void)addHost:(OneNativePortalHostViewComponentView *)host;
- (void)removeHost:(OneNativePortalHostViewComponentView *)host;
- (OneNativePortalHostViewComponentView *)hostForPortal:(OneNativePortalViewComponentView *)portal;
- (BOOL)isReplaced:(OneNativePortalViewComponentView *)portal;
- (void)refresh;
- (void)publishLayouts;
@end
