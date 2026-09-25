#ifdef __cplusplus
#import <React/RCTViewComponentView.h>

NS_ASSUME_NONNULL_BEGIN

@protocol OneNativeArrangementHost <NSObject>
- (void)invalidatePanes;
@end

@interface OneNativeArrangementViewComponentView : RCTViewComponentView <OneNativeArrangementHost>
- (void)invalidatePanes;
@end

@interface OneNativeArrangementSlotComponentView : RCTViewComponentView
@property (nonatomic, weak, nullable) id<OneNativeArrangementHost> arrangementHost;
@property (nonatomic, copy) NSString *placement;
@property (nonatomic, assign) CGFloat splitRatio;
@property (nonatomic, assign) CGFloat splitMinHorizontal;
@property (nonatomic, assign) CGFloat splitIdealHorizontal;
@property (nonatomic, assign) CGFloat splitMaxHorizontal;
@property (nonatomic, assign) CGFloat splitMinVertical;
@property (nonatomic, assign) CGFloat splitIdealVertical;
@property (nonatomic, assign) CGFloat splitMaxVertical;
@property (nonatomic, assign) CGFloat splitMinWidth;
@property (nonatomic, assign) CGFloat splitIdealWidth;
@property (nonatomic, assign) CGFloat splitMaxWidth;
@property (nonatomic, assign) CGFloat splitMinHeight;
@property (nonatomic, assign) CGFloat splitIdealHeight;
@property (nonatomic, assign) CGFloat splitMaxHeight;
@property (nonatomic, assign) BOOL splitFixedHorizontal;
@property (nonatomic, assign) BOOL splitFixedVertical;
@property (nonatomic, copy) NSString *overlayEdge;
- (void)updateNativeFrame:(CGRect)frame;
@end

NS_ASSUME_NONNULL_END
#endif
