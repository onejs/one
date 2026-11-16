#import <objc/runtime.h>
#import "TextInput+DelegateManager.h"

@implementation UITextView (DelegateManager)

/**
 * We are aware that delegate is set by RN on mount and we can not re-define it
 * but we are using composite delegate to forward all calls to original delegate
 * so we use this method to force set our delegate
 */
- (void)oneKC_setForceDelegate:(id<UITextViewDelegate>)delegate
{
  Ivar ivar = class_getInstanceVariable([UITextView class], "_delegate");
  if (ivar) {
    object_setIvar(self, ivar, delegate);
  }
}

@end

@implementation UITextField (DelegateManager)

/**
 * Some `UITextField` subclasses (e.g. card-input fields from third-party SDKs, aka Square)
 * make themselves their own UIKit delegate via `[super setDelegate:self]` and
 * override `setDelegate:` so that the public setter only stores an *inner*
 * delegate, forwarding UIKit callbacks to it via `forwardInvocation:`.
 *
 * For such fields the regular `textField.delegate = composite` does NOT replace
 * the real UIKit delegate slot — it only points the field's inner delegate at us
 * while the field itself stays the real delegate. Combined with the composite
 * forwarding unhandled calls back to that same field, this creates an infinite
 * recursion (it blows the stack already inside `respondsToSelector:`).
 *
 * Writing the `_delegate` ivar directly installs the composite as the genuine
 * UIKit delegate without touching the field's inner delegate slot, so no
 * back-pointer to the composite is ever created and the chain stays acyclic:
 * `UIKit -> composite -> field -> field's original inner delegate`.
 */
- (void)oneKC_setForceDelegate:(id<UITextFieldDelegate>)delegate
{
  Ivar ivar = class_getInstanceVariable([UITextField class], "_delegate");
  if (ivar) {
    object_setIvar(self, ivar, delegate);
  }
}

@end
