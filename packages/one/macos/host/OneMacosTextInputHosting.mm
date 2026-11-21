#import "OneMacosTextInputHosting.h"
#import <objc/runtime.h>

// what the editing views report back to the component view
@protocol OneMacosTextOwner <NSObject>
- (void)textEditorDidFocus;
- (void)textEditorDidBlur;
- (void)textEditorKeyDown:(NSEvent *)event;
- (NSString *)textEditor:(NSTextView *)editor limitedReplacement:(NSString *)string range:(NSRange)range;
@end

static char kFieldEditorKey;

// share committed insertion handling without intercepting marked text updates.
@interface OneMacosCommittedTextView : NSTextView
@end

@implementation OneMacosCommittedTextView
- (BOOL)shouldChangeTextInRange:(NSRange)range replacementString:(NSString *)string
{
  if (self.hasMarkedText) {
    return [super shouldChangeTextInRange:range replacementString:string];
  }
  // plaintext paste uses this path without calling insertText.
  NSString *limited = [(id<OneMacosTextOwner>)self.delegate textEditor:self limitedReplacement:string range:range];
  if (limited == string || [limited isEqualToString:string]) {
    return [super shouldChangeTextInRange:range replacementString:string];
  }
  if (limited.length > 0) {
    [self insertText:limited replacementRange:range];
  }
  return NO;
}

- (void)insertText:(id)text replacementRange:(NSRange)range
{
  NSString *string = [text isKindOfClass:NSAttributedString.class] ? [text string] : text;
  // insertText commits input; setMarkedText remains free to compose beyond the
  // limit. appkit also commits unmarkText through this insertion path.
  NSString *limited = [(id<OneMacosTextOwner>)self.delegate textEditor:self limitedReplacement:string range:range];
  if (string.length > 0 && limited.length == 0 && !self.hasMarkedText) {
    return;
  }
  [super insertText:[limited isEqualToString:string] ? text : limited replacementRange:range];
}
@end

// single line field editor: key presses reach react as onKeyPress events.
@interface OneMacosFieldEditor : OneMacosCommittedTextView
@end

@implementation OneMacosFieldEditor

- (void)keyDown:(NSEvent *)event
{
  if ([self.delegate respondsToSelector:@selector(textEditorKeyDown:)]) {
    [(id<OneMacosTextOwner>)self.delegate textEditorKeyDown:event];
  }
  [super keyDown:event];
}
@end

@interface OneMacosTextFieldCell : NSTextFieldCell
@end

@implementation OneMacosTextFieldCell
- (NSTextView *)fieldEditorForView:(NSView *)view
{
  NSWindow *window = view.window;
  if (!window) {
    return nil;
  }
  OneMacosFieldEditor *editor = objc_getAssociatedObject(window, &kFieldEditorKey);
  if (!editor) {
    editor = [[OneMacosFieldEditor alloc] initWithFrame:NSZeroRect];
    editor.fieldEditor = YES;
    editor.allowsUndo = YES;
    objc_setAssociatedObject(window, &kFieldEditorKey, editor, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
  }
  return editor;
}
@end

@interface OneMacosTextField : NSTextField
@property (nonatomic, weak) id<OneMacosTextOwner> owner;
@end

@implementation OneMacosTextField
+ (Class)cellClass
{
  return [OneMacosTextFieldCell class];
}

- (BOOL)becomeFirstResponder
{
  BOOL result = [super becomeFirstResponder];
  if (result) {
    [_owner textEditorDidFocus];
  }
  return result;
}

- (void)textDidEndEditing:(NSNotification *)notification
{
  [super textDidEndEditing:notification];
  [_owner textEditorDidBlur];
}

- (void)textEditorKeyDown:(NSEvent *)event
{
  [_owner textEditorKeyDown:event];
}

- (NSString *)textEditor:(NSTextView *)editor limitedReplacement:(NSString *)string range:(NSRange)range
{
  return [_owner textEditor:editor limitedReplacement:string range:range];
}
@end

// appkit makes the field its editor's delegate; preserve its formatter checks.
@interface NSTextField (OneMacosEditorDelegate)
- (BOOL)textView:(NSTextView *)editor shouldChangeTextInRange:(NSRange)range replacementString:(NSString *)string;
@end

@interface OneMacosSecureTextField : NSSecureTextField
@property (nonatomic, weak) id<OneMacosTextOwner> owner;
@end

@implementation OneMacosSecureTextField
- (BOOL)textView:(NSTextView *)editor shouldChangeTextInRange:(NSRange)range replacementString:(NSString *)string
{
  if (![super textView:editor shouldChangeTextInRange:range replacementString:string]) {
    return NO;
  }
  // keep AppKit's secure field editor. it does not support marked text.
  NSString *limited = [_owner textEditor:editor limitedReplacement:string range:range];
  if (limited == string || [limited isEqualToString:string]) {
    return YES;
  }
  if (limited.length > 0) {
    [editor insertText:limited replacementRange:range];
  }
  return NO;
}

- (BOOL)becomeFirstResponder
{
  BOOL result = [super becomeFirstResponder];
  if (result) {
    [_owner textEditorDidFocus];
  }
  return result;
}

- (void)textDidEndEditing:(NSNotification *)notification
{
  [super textDidEndEditing:notification];
  [_owner textEditorDidBlur];
}
@end

// Multiline editor: reports focus and key presses to its component view and
// draws the placeholder, which NSTextView has no notion of.
@interface OneMacosTextView : OneMacosCommittedTextView
@property (nonatomic, weak) id<OneMacosTextOwner> owner;
@property (nonatomic, copy) NSAttributedString *placeholder;
@end

@implementation OneMacosTextView

- (BOOL)becomeFirstResponder
{
  BOOL result = [super becomeFirstResponder];
  if (result) {
    [_owner textEditorDidFocus];
  }
  return result;
}

- (BOOL)resignFirstResponder
{
  BOOL result = [super resignFirstResponder];
  if (result) {
    [_owner textEditorDidBlur];
  }
  return result;
}

- (void)keyDown:(NSEvent *)event
{
  [_owner textEditorKeyDown:event];
  [super keyDown:event];
}

- (void)drawRect:(NSRect)dirtyRect
{
  [super drawRect:dirtyRect];
  if (self.string.length == 0 && _placeholder.length > 0) {
    [_placeholder drawAtPoint:NSMakePoint(self.textContainerInset.width, self.textContainerInset.height)];
  }
}

@end


@interface OneMacosTextInputHostView () <OneMacosTextOwner, NSTextViewDelegate, NSTextFieldDelegate>
@end
@implementation OneMacosTextInputHostView {
  NSTextField* _field;
  NSScrollView* _scrollView;
  OneMacosTextView* _textView;
  NSDictionary* _props;
  NSDictionary* _attributes;
  NSInteger _mostRecentEventCount;
  BOOL _comingFromJS, _didAutoFocus;
  NSSize _lastContentSize;
  id _selectionObserver;
}
- (BOOL)isFlipped { return YES; }
- (BOOL)acceptsFirstResponder { return NO; }
- (NSString*)text { return [self currentText]; }
- (NSInteger)eventCount { return _mostRecentEventCount; }
- (NSTextView *)activeEditor
{
  if (_textView) {
    return _textView;
  }
  return (NSTextView *)[_field currentEditor];
}

- (void)installEditorForMultiline:(BOOL)multiline secure:(BOOL)secure
{
  if (multiline) {
    if (_textView) {
      return;
    }
    [self removeEditors];
    _textView = [[OneMacosTextView alloc] initWithFrame:NSZeroRect];
    _textView.owner = self;
    _textView.delegate = self;
    _textView.drawsBackground = NO;
    _textView.richText = NO;
    _textView.allowsUndo = YES;
    _textView.textContainerInset = NSZeroSize;
    _textView.textContainer.lineFragmentPadding = 0;
    _textView.minSize = NSZeroSize;
    _textView.maxSize = NSMakeSize(CGFLOAT_MAX, CGFLOAT_MAX);
    _textView.horizontallyResizable = NO;
    _textView.verticallyResizable = YES;
    _textView.textContainer.widthTracksTextView = YES;
    _textView.textContainer.heightTracksTextView = NO;
    _textView.automaticQuoteSubstitutionEnabled = NO;
    _textView.automaticDashSubstitutionEnabled = NO;
    _textView.automaticTextReplacementEnabled = NO;
    _scrollView = [[NSScrollView alloc] initWithFrame:NSZeroRect];
    _scrollView.drawsBackground = NO;
    _scrollView.borderType = NSNoBorder;
    _scrollView.hasVerticalScroller = YES;
    _scrollView.hasHorizontalScroller = NO;
    _scrollView.autohidesScrollers = YES;
    _scrollView.scrollerStyle = NSScrollerStyleOverlay;
    _scrollView.documentView = _textView;
    [self addSubview:_scrollView];
    return;
  }
  Class fieldClass = secure ? [OneMacosSecureTextField class] : [OneMacosTextField class];
  if ([_field isMemberOfClass:fieldClass]) {
    return;
  }
  NSString *text = _field ? _field.stringValue : nil;
  [self removeEditors];
  _field = [[fieldClass alloc] initWithFrame:NSZeroRect];
  [(id)_field setOwner:self];
  _field.delegate = self;
  _field.bordered = NO;
  _field.bezeled = NO;
  _field.drawsBackground = NO;
  _field.focusRingType = NSFocusRingTypeNone;
  _field.cell.wraps = NO;
  _field.cell.scrollable = YES;
  _field.cell.usesSingleLineMode = YES;
  _field.lineBreakMode = NSLineBreakByClipping;
  if (text) {
    _field.stringValue = text;
  }
  [self addSubview:_field];
}

- (void)removeEditors
{
  [_field removeFromSuperview];
  [_scrollView removeFromSuperview];
  _field = nil;
  _scrollView = nil;
  _textView = nil;
}

#pragma mark - Text

- (NSString *)currentText
{
  if (_textView) {
    return _textView.string;
  }
  NSTextView *editor = [self activeEditor];
  return editor ? editor.string : _field.stringValue;
}

- (NSRange)currentSelection
{
  NSTextView *editor = [self activeEditor];
  return editor ? editor.selectedRange : NSMakeRange(_field.stringValue.length, 0);
}

- (void)setSelection:(NSRange)range
{
  NSTextView *editor = [self activeEditor];
  if (!editor) {
    return;
  }
  NSUInteger length = editor.string.length;
  range.location = MIN(range.location, length);
  range.length = MIN(range.length, length - range.location);
  _comingFromJS = YES;
  editor.selectedRange = range;
  _comingFromJS = NO;
}

- (void)setText:(NSString *)text
{
  if ([[self currentText] isEqualToString:text]) {
    return;
  }
  NSRange selection = [self currentSelection];
  NSTextView *editor = [self activeEditor];
  _comingFromJS = YES;
  if (editor) {
    [editor.textStorage replaceCharactersInRange:NSMakeRange(0, editor.string.length) withString:text];
    editor.selectedRange = NSMakeRange(MIN(selection.location, text.length), 0);
  } else {
    _field.stringValue = text;
  }
  _comingFromJS = NO;
  [self applyTextAttributes];
  [_textView setNeedsDisplay:YES];
}

#pragma mark - Metrics and events

- (NSSize)usedTextSize
{
  if (_textView) {
    [_textView.layoutManager ensureLayoutForTextContainer:_textView.textContainer];
    return [_textView.layoutManager usedRectForTextContainer:_textView.textContainer].size;
  }
  return _field.attributedStringValue.size;
}


- (NSDictionary*)metrics {
  NSRange selection = [self currentSelection];
  NSSize content = [self usedTextSize], container = (_scrollView ?: (NSView*)_field).frame.size;
  return @{@"text": [self currentText] ?: @"", @"eventCount": @(_mostRecentEventCount),
    @"selection": @{@"start": @(selection.location), @"end": @(NSMaxRange(selection))},
    @"contentSize": @{@"width": @(content.width), @"height": @(content.height)},
    @"layoutMeasurement": @{@"width": @(container.width), @"height": @(container.height)},
    @"contentOffset": @{@"x": @(_scrollView.contentView.bounds.origin.x), @"y": @(_scrollView.contentView.bounds.origin.y)},
    @"zoomScale": @1};
}
- (void)emit:(NSString*)name { if (_onEvent) _onEvent(name, [self metrics]); }
- (void)textEditorDidFocus {
  NSTextView* editor = [self activeEditor];
  if (editor && !_selectionObserver) {
    __weak OneMacosTextInputHostView* weak = self;
    _selectionObserver = [NSNotificationCenter.defaultCenter addObserverForName:NSTextViewDidChangeSelectionNotification object:editor queue:nil usingBlock:^(NSNotification*) { [weak selectionDidChange]; }];
  }
  [self emit:@"focus"];
}
- (void)textEditorDidBlur {
  if (_selectionObserver) { [NSNotificationCenter.defaultCenter removeObserver:_selectionObserver]; _selectionObserver = nil; }
  [self emit:@"endEditing"]; [self emit:@"blur"];
}
- (void)selectionDidChange { if (!_comingFromJS) [self emit:@"selectionChange"]; }
- (void)textEditorKeyDown:(NSEvent*)event {
  if (event.modifierFlags & (NSEventModifierFlagCommand | NSEventModifierFlagControl)) return;
  NSString* key = event.keyCode == 51 ? @"Backspace" : event.keyCode == 36 || event.keyCode == 76 ? @"Enter"
    : event.keyCode == 48 ? @"Tab" : event.keyCode == 53 ? @"Escape" : event.characters ?: @"";
  if (_onEvent) _onEvent(@"keyPress", @{@"key": key, @"eventCount": @(_mostRecentEventCount)});
}
- (void)userDidEdit {
  ++_mostRecentEventCount;
  [self emit:@"change"];
  NSSize content = [self usedTextSize];
  if (!NSEqualSizes(content, _lastContentSize)) { _lastContentSize = content; [self emit:@"contentSizeChange"]; }
}
- (void)textDidChange:(NSNotification *)notification
{
  if (!_comingFromJS) {
    [self userDidEdit];
  }
}

- (void)controlTextDidChange:(NSNotification *)notification
{
  if (!_comingFromJS) {
    [self userDidEdit];
  }
}

- (NSString *)textEditor:(NSTextView *)editor limitedReplacement:(NSString *)string range:(NSRange)range
{
  if (_comingFromJS || !string) {
    return string;
  }
  NSInteger maxLength = _props[@"maxLength"] ? [_props[@"maxLength"] integerValue] : -1;
  if (maxLength < 0) {
    return string;
  }
  if (range.location == NSNotFound) {
    range = editor.hasMarkedText ? editor.markedRange : editor.selectedRange;
  }
  NSInteger room = maxLength - (NSInteger)(editor.string.length - range.length);
  if ((NSInteger)string.length <= room) {
    return string;
  }
  if (room <= 0) {
    return @"";
  }
  // rn counts utf16 units; round down rather than expanding beyond the budget.
  NSRange last = [string rangeOfComposedCharacterSequenceAtIndex:(NSUInteger)room - 1];
  NSUInteger end = NSMaxRange(last) > (NSUInteger)room ? last.location : (NSUInteger)room;
  return [string substringToIndex:end];
}

- (BOOL)control:(NSControl*)control textView:(NSTextView*)view doCommandBySelector:(SEL)selector { return [self textView:view doCommandBySelector:selector]; }
- (BOOL)textView:(NSTextView*)view doCommandBySelector:(SEL)selector {
  if (selector == @selector(insertTab:)) { [view.window selectNextKeyView:view]; return YES; }
  if (selector == @selector(insertBacktab:)) { [view.window selectPreviousKeyView:view]; return YES; }
  if (selector == @selector(insertNewline:) || selector == @selector(insertNewlineIgnoringFieldEditor:)) {
    NSString* behavior = _props[@"submitBehavior"];
    // a multiline input submits on a bare return; shift or option with it breaks the line
    NSEvent* key = NSApp.currentEvent.type == NSEventTypeKeyDown ? NSApp.currentEvent : nil;
    const BOOL bare = selector == @selector(insertNewline:) && !(key.modifierFlags & NSEventModifierFlagShift);
    const BOOL submits = [_props[@"multiline"] boolValue] ? bare && ([behavior isEqualToString:@"submit"] || [behavior isEqualToString:@"blurAndSubmit"]) : ![behavior isEqualToString:@"newline"];
    if (!submits) return NO;
    [self emit:@"submitEditing"];
    if ([behavior isEqualToString:@"blurAndSubmit"]) [view.window makeFirstResponder:nil];
    return YES;
  }
  return NO;
}
- (void)applyTextAttributes {
  NSDictionary* typing = _attributes;
  NSMutableDictionary* placeholderAttributes = [typing mutableCopy];
  placeholderAttributes[NSForegroundColorAttributeName] = _props[@"placeholderTextColor"] ?: NSColor.placeholderTextColor;
  NSAttributedString* placeholder = [[NSAttributedString alloc] initWithString:_props[@"placeholder"] ?: @"" attributes:placeholderAttributes];
  if (_textView) {
    _textView.typingAttributes = typing;
    if (_textView.textStorage.length) [_textView.textStorage setAttributes:typing range:NSMakeRange(0, _textView.textStorage.length)];
    _textView.font = typing[NSFontAttributeName]; _textView.placeholder = placeholder;
  } else {
    _field.font = typing[NSFontAttributeName]; _field.textColor = typing[NSForegroundColorAttributeName];
    NSParagraphStyle* paragraph = typing[NSParagraphStyleAttributeName];
    _field.alignment = paragraph ? paragraph.alignment : NSTextAlignmentNatural;
    _field.placeholderAttributedString = placeholder;
  }
}
- (void)configure:(NSDictionary*)props attributes:(NSDictionary*)attributes {
  _props = props; _attributes = attributes;
  [self installEditorForMultiline:[props[@"multiline"] boolValue] secure:[props[@"secureTextEntry"] boolValue]];
  const BOOL editable = (!props[@"editable"] || [props[@"editable"] boolValue]) && ![props[@"readOnly"] boolValue];
  if (_textView) {
    _textView.editable = editable; _textView.selectable = YES;
    _textView.continuousSpellCheckingEnabled = [props[@"spellCheck"] boolValue];
    _textView.automaticSpellingCorrectionEnabled = [props[@"autoCorrect"] boolValue];
    if (props[@"cursorColor"]) _textView.insertionPointColor = props[@"cursorColor"];
    if (props[@"selectionColor"]) _textView.selectedTextAttributes = @{NSBackgroundColorAttributeName: props[@"selectionColor"]};
  } else { _field.editable = editable; _field.selectable = YES; }
  [self applyTextAttributes];
  const NSInteger count = [props[@"mostRecentEventCount"] integerValue];
  if (props[@"text"]) [self applyText:props[@"text"] eventCount:count];
  NSDictionary* selection = props[@"selection"];
  if (selection && count >= _mostRecentEventCount) {
    const NSInteger start = MAX(0, [selection[@"start"] integerValue]), end = MAX(start, [selection[@"end"] integerValue]);
    [self setSelection:NSMakeRange(start, end - start)];
  }
  [self layoutEditors]; [self focusIfNeeded];
}
- (void)applyText:(NSString*)text eventCount:(NSInteger)count { if (count >= _mostRecentEventCount) [self setText:text]; }
- (void)layoutEditors {
  NSRect content = NSMakeRect(_contentInsets.left, _contentInsets.top,
    MAX(0, self.bounds.size.width - _contentInsets.left - _contentInsets.right), MAX(0, self.bounds.size.height - _contentInsets.top - _contentInsets.bottom));
  if (_scrollView) {
    _scrollView.frame = content;
    _textView.minSize = NSMakeSize(0, content.size.height);
    _textView.frame = NSMakeRect(0, 0, content.size.width, MAX(_textView.frame.size.height, content.size.height));
    _textView.textContainer.containerSize = NSMakeSize(content.size.width, CGFLOAT_MAX);
  } else _field.frame = content;
}
- (void)setContentInsets:(NSEdgeInsets)insets { _contentInsets = insets; [self layoutEditors]; }
- (void)setFrameSize:(NSSize)size { [super setFrameSize:size]; [self layoutEditors]; }
- (void)focusIfNeeded {
  if (!_didAutoFocus && self.window && [_props[@"autoFocus"] boolValue]) { _didAutoFocus = YES; [self focusEditor]; }
}
- (void)viewDidMoveToWindow { [super viewDidMoveToWindow]; [self focusIfNeeded]; }
- (void)focusEditor { [self.window makeFirstResponder:_textView ?: (NSResponder*)_field]; }
- (void)command:(NSString*)name args:(NSArray*)args {
  if ([name isEqualToString:@"focus"]) [self focusEditor];
  else if ([name isEqualToString:@"blur"]) {
    if ([self activeEditor] && self.window.firstResponder == [self activeEditor]) [self.window makeFirstResponder:nil];
  } else if ([name isEqualToString:@"setTextAndSelection"] && args.count >= 4 && [args[0] integerValue] >= _mostRecentEventCount) {
    if ([args[1] isKindOfClass:NSString.class]) [self setText:args[1]];
    const NSInteger start = [args[2] integerValue], end = [args[3] integerValue];
    if (start >= 0 && end >= 0) [self setSelection:NSMakeRange(start, MAX(end - start, 0))];
  }
}
- (void)dealloc { if (_selectionObserver) [NSNotificationCenter.defaultCenter removeObserver:_selectionObserver]; }
@end
