#import <UIKit/UIKit.h>

@interface UITextView (OneKCDelegateManager)

- (void)oneKC_setForceDelegate:(id<UITextViewDelegate>)delegate;

@end

@interface UITextField (OneKCDelegateManager)

- (void)oneKC_setForceDelegate:(id<UITextFieldDelegate>)delegate;

@end
