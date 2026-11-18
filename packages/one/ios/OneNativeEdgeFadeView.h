#import <UIKit/UIKit.h>

@interface OneNativeEdgeFadeView : UIView
- (void)configureWithFadeTop:(CGFloat)fadeTop
                 fadeBottom:(CGFloat)fadeBottom
                   fadeLeft:(CGFloat)fadeLeft
                  fadeRight:(CGFloat)fadeRight
                   curveTop:(NSString *)curveTop
                curveBottom:(NSString *)curveBottom
                  curveLeft:(NSString *)curveLeft
                 curveRight:(NSString *)curveRight
                 fadeRadius:(CGFloat)fadeRadius
                       mode:(NSString *)mode
                 blurRadius:(CGFloat)blurRadius
           frostProgression:(CGFloat)frostProgression
               overlayColor:(int32_t)overlayColor;
- (void)attachToView:(UIView *)view;
- (void)syncLayerScales;
- (void)restoreMask;
- (void)updateLayout;
- (void)contentAdded:(UIView *)subview;
- (void)reset;
@end
