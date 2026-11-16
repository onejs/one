#import <React/RCTViewComponentView.h>
#import <UIKit/UIKit.h>


@interface OneClippingScrollViewDecoratorViewComponentView :
    RCTViewComponentView
@property (nonatomic, assign) BOOL applyWorkaroundForContentInsetHitTestBug;
@end
