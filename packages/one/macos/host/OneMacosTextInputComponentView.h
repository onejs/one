#import "OneMacosComponentView.h"

// TextInput: an NSTextView inside the content frame. Single line inputs do
// not wrap and take Return as submit; multiline inputs wrap. The text is
// controlled the way RCTTextInputComponentView controls it, by event count.
@interface OneMacosTextInputComponentView : OneMacosViewComponentView
@end
