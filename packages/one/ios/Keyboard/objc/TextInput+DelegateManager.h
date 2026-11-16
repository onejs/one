#import <UIKit/UIKit.h>

@interface UITextView (DelegateManager)

- (void)oneKC_setForceDelegate:(id<UITextViewDelegate>)delegate;

@end

@interface UITextField (DelegateManager)

- (void)oneKC_setForceDelegate:(id<UITextFieldDelegate>)delegate;

@end
