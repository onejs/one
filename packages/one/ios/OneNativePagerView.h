#import <UIKit/UIKit.h>

@interface OneNativePagerView : UIView
@property(nonatomic, copy) void (^onScroll)(NSInteger position, CGFloat offset);
@property(nonatomic, copy) void (^onSelected)(NSInteger position);
@property(nonatomic, copy) void (^onStateChange)(NSString *state);

- (void)configureWithInitialPage:(NSInteger)initialPage
                 scrollEnabled:(BOOL)scrollEnabled
                      vertical:(BOOL)vertical
                           rtl:(BOOL)rtl
                    pageMargin:(CGFloat)pageMargin
                      overdrag:(BOOL)overdrag
         dismissKeyboardOnDrag:(BOOL)dismissKeyboardOnDrag;
- (void)mountPage:(UIView *)page atIndex:(NSInteger)index;
- (void)unmountPage:(UIView *)page;
- (void)setPage:(NSInteger)index;
- (void)setPageWithoutAnimation:(NSInteger)index;
- (void)setScrollEnabledImperatively:(BOOL)enabled;
- (void)reset;
@end
