#ifdef __cplusplus
#import <React/RCTViewComponentView.h>

NS_ASSUME_NONNULL_BEGIN

// a Tabs or a Pager hosting Tab pages; a page reports here when its props move.
@protocol OneNativePageHost <NSObject>
- (void)invalidatePages;
@end

@interface OneNativeTabsComponentView : RCTViewComponentView <OneNativePageHost>
- (void)invalidatePages;
@end

@interface OneNativeTabComponentView : RCTViewComponentView
@property (nonatomic, weak, nullable) id<OneNativePageHost> tabs;
@property (nonatomic, copy) NSString *tabId;
@property (nonatomic, copy) NSString *kind;
@property (nonatomic, copy) NSString *title;
@property (nonatomic, copy) NSString *systemImage;
@property (nonatomic, copy) NSString *badge;
@property (nonatomic, copy) NSString *role;
@property (nonatomic, assign) CGFloat slotHeight;
@property (nonatomic, copy) NSString *tabModifiers;
@property (nonatomic, copy) NSDictionary *swiftStyle;
- (void)updateNativeFrame:(CGRect)frame;
- (void)emitSDKEvent:(NSString *)name value:(NSString *)value;
@end

NS_ASSUME_NONNULL_END
#endif
