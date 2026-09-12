#ifdef __cplusplus
#import <React/RCTViewComponentView.h>

NS_ASSUME_NONNULL_BEGIN

@interface OneNativeTabsComponentView : RCTViewComponentView
- (void)invalidatePages;
@end

@interface OneNativeTabComponentView : RCTViewComponentView
@property (nonatomic, weak, nullable) OneNativeTabsComponentView *tabs;
@property (nonatomic, copy) NSString *tabId;
@property (nonatomic, copy) NSString *title;
@property (nonatomic, copy) NSString *systemImage;
@property (nonatomic, copy) NSString *badge;
@property (nonatomic, copy) NSString *role;
@property (nonatomic, assign) BOOL action;
- (void)updateNativeFrame:(CGRect)frame;
@end

NS_ASSUME_NONNULL_END
#endif
