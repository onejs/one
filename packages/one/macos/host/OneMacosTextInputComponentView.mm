#import "OneMacosTextInputComponentView.h"

#import <objc/runtime.h>

#include <react/renderer/components/iostextinput/TextInputComponentDescriptor.h>
#include <react/renderer/components/iostextinput/TextInputProps.h>
#include <react/renderer/components/iostextinput/TextInputShadowNode.h>
#include <react/renderer/components/textinput/TextInputEventEmitter.h>

#import "OneMacosText.h"

using namespace facebook::react;

// what the editing views report back to the component view
@protocol OneMacosTextOwner <NSObject>
- (void)textEditorDidFocus;
- (void)textEditorDidBlur;
- (void)textEditorKeyDown:(NSEvent *)event;
@end

static char kFieldEditorKey;

// Single line input editor: the field editor AppKit swaps in while a field is
// being edited, so key presses reach React the way iOS onKeyPress does.
@interface OneMacosFieldEditor : NSTextView
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
@end

@interface OneMacosSecureTextField : NSSecureTextField
@property (nonatomic, weak) id<OneMacosTextOwner> owner;
@end

@implementation OneMacosSecureTextField
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
@interface OneMacosTextView : NSTextView
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

@interface OneMacosTextInputComponentView () <OneMacosTextOwner, NSTextViewDelegate, NSTextFieldDelegate>
@end

// Single line inputs are an NSTextField (NSSecureTextField for secureTextEntry),
// which scrolls to keep the caret visible. Multiline inputs are an NSTextView in
// an NSScrollView. The text is controlled the way RCTTextInputComponentView
// controls it: every user edit bumps an event count, and state from React only
// replaces the text when it has caught up with that count.
@implementation OneMacosTextInputComponentView {
  NSTextField *_field;
  NSScrollView *_scrollView;
  OneMacosTextView *_textView;
  TextInputShadowNode::ConcreteState::Shared _state;
  int64_t _mostRecentEventCount;
  BOOL _comingFromJS;
  BOOL _didAutoFocus;
  NSSize _lastContentSize;
  id _selectionObserver;
}

- (const TextInputProps &)textInputProps
{
  return static_cast<const TextInputProps &>(*self.props);
}

- (std::shared_ptr<const TextInputEventEmitter>)textInputEmitter
{
  return std::static_pointer_cast<const TextInputEventEmitter>(self.eventEmitter);
}

// the input is a text field, not a pressable, so it never takes focus itself
- (BOOL)acceptsFirstResponder
{
  return NO;
}

#pragma mark - Editors

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

- (TextInputEventEmitter::Metrics)metrics
{
  TextInputEventEmitter::Metrics metrics;
  metrics.text = [self currentText].UTF8String ?: "";
  NSRange selection = [self currentSelection];
  metrics.selectionRange = {(int)selection.location, (int)selection.length};
  NSSize content = [self usedTextSize];
  metrics.contentSize = {(Float)content.width, (Float)content.height};
  NSSize container = (_scrollView ?: (NSView *)_field).frame.size;
  metrics.containerSize = {(Float)container.width, (Float)container.height};
  metrics.layoutMeasurement = metrics.containerSize;
  metrics.eventCount = (int)_mostRecentEventCount;
  metrics.zoomScale = 1;
  metrics.target = self.reactTag;
  return metrics;
}

- (void)textEditorDidFocus
{
  NSTextView *editor = [self activeEditor];
  if (editor && !_selectionObserver) {
    __weak OneMacosTextInputComponentView *weakSelf = self;
    _selectionObserver = [NSNotificationCenter.defaultCenter
        addObserverForName:NSTextViewDidChangeSelectionNotification
                    object:editor
                     queue:nil
                usingBlock:^(NSNotification *) {
                  [weakSelf selectionDidChange];
                }];
  }
  if (auto emitter = [self textInputEmitter]) {
    emitter->onFocus([self metrics]);
  }
}

- (void)textEditorDidBlur
{
  if (_selectionObserver) {
    [NSNotificationCenter.defaultCenter removeObserver:_selectionObserver];
    _selectionObserver = nil;
  }
  if (auto emitter = [self textInputEmitter]) {
    emitter->onEndEditing([self metrics]);
    emitter->onBlur([self metrics]);
  }
}

- (void)selectionDidChange
{
  if (_comingFromJS) {
    return;
  }
  if (auto emitter = [self textInputEmitter]) {
    emitter->onSelectionChange([self metrics]);
  }
}

- (void)textEditorKeyDown:(NSEvent *)event
{
  // shortcuts are not key presses
  if (event.modifierFlags & (NSEventModifierFlagCommand | NSEventModifierFlagControl)) {
    return;
  }
  auto emitter = [self textInputEmitter];
  if (!emitter) {
    return;
  }
  std::string key = event.characters.UTF8String ?: "";
  if (event.keyCode == 51) {
    key = "Backspace";
  } else if (event.keyCode == 36 || event.keyCode == 76) {
    key = "Enter";
  } else if (event.keyCode == 48) {
    key = "Tab";
  } else if (event.keyCode == 53) {
    key = "Escape";
  }
  emitter->onKeyPress({key, (int)_mostRecentEventCount});
}

// edits that originate in the view bump the event count and tell React; the
// state carries the new text so the shadow node measures what is on screen
- (void)userDidEdit
{
  NSInteger maxLength = [self textInputProps].maxLength;
  NSString *text = [self currentText];
  if (maxLength > 0 && (NSInteger)text.length > maxLength) {
    NSTextView *editor = [self activeEditor];
    NSRange selection = editor.selectedRange;
    _comingFromJS = YES;
    [editor.textStorage replaceCharactersInRange:NSMakeRange(maxLength, text.length - maxLength) withString:@""];
    editor.selectedRange = NSMakeRange(MIN(selection.location, (NSUInteger)maxLength), 0);
    _comingFromJS = NO;
  }
  _mostRecentEventCount++;
  [self updateStateWithCurrentText];
  if (auto emitter = [self textInputEmitter]) {
    emitter->onChange([self metrics]);
    NSSize content = [self usedTextSize];
    if (!NSEqualSizes(content, _lastContentSize)) {
      _lastContentSize = content;
      emitter->onContentSizeChange([self metrics]);
    }
  }
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

- (BOOL)textView:(NSTextView *)textView shouldChangeTextInRange:(NSRange)range replacementString:(NSString *)string
{
  if (_comingFromJS || !self.props || !string) {
    return YES;
  }
  NSInteger maxLength = [self textInputProps].maxLength;
  if (maxLength <= 0) {
    return YES;
  }
  NSInteger room = maxLength - (NSInteger)(textView.string.length - range.length);
  if ((NSInteger)string.length <= room) {
    return YES;
  }
  if (room > 0) {
    // a paste that does not fit is cut to what does
    NSString *cut = [string substringToIndex:room];
    dispatch_async(dispatch_get_main_queue(), ^{
      [textView insertText:cut replacementRange:range];
    });
  }
  return NO;
}

- (BOOL)control:(NSControl *)control textView:(NSTextView *)textView doCommandBySelector:(SEL)selector
{
  return [self textView:textView doCommandBySelector:selector];
}

- (BOOL)textView:(NSTextView *)textView doCommandBySelector:(SEL)selector
{
  if (selector == @selector(insertTab:)) {
    [textView.window selectNextKeyView:textView];
    return YES;
  }
  if (selector == @selector(insertBacktab:)) {
    [textView.window selectPreviousKeyView:textView];
    return YES;
  }
  if (selector == @selector(insertNewline:) || selector == @selector(insertNewlineIgnoringFieldEditor:)) {
    const auto &props = [self textInputProps];
    SubmitBehavior behavior = props.submitBehavior;
    bool submits = props.multiline ? (behavior == SubmitBehavior::Submit || behavior == SubmitBehavior::BlurAndSubmit)
                                   : behavior != SubmitBehavior::Newline;
    if (!submits) {
      return NO;
    }
    if (auto emitter = [self textInputEmitter]) {
      emitter->onSubmitEditing([self metrics]);
    }
    if (behavior == SubmitBehavior::BlurAndSubmit) {
      [textView.window makeFirstResponder:nil];
    }
    return YES;
  }
  return NO;
}

#pragma mark - State

- (void)updateStateWithCurrentText
{
  if (!_state) {
    return;
  }
  auto data = _state->getData();
  const auto &base = data.reactTreeAttributedString.getBaseTextAttributes();
  ShadowView parent;
  const auto &fragments = data.reactTreeAttributedString.getFragments();
  if (!fragments.empty()) {
    parent = fragments.front().parentShadowView;
  }
  AttributedString text;
  text.setBaseTextAttributes(base);
  text.appendFragment({.string = [self currentText].UTF8String ?: "", .textAttributes = base, .parentShadowView = parent});
  _state->updateState(TextInputState{
      AttributedStringBox{text}, data.reactTreeAttributedString, data.paragraphAttributes, _mostRecentEventCount});
}

- (void)updateState:(const State::Shared &)state oldState:(const State::Shared &)oldState
{
  _state = std::static_pointer_cast<const TextInputShadowNode::ConcreteState>(state);
  const auto &data = _state->getData();
  if (_mostRecentEventCount != data.mostRecentEventCount) {
    return;
  }
  if (data.attributedStringBox.getMode() == AttributedStringBox::Mode::Value) {
    const auto &string = data.attributedStringBox.getValue();
    std::string text;
    for (const auto &fragment : string.getFragments()) {
      text += fragment.string;
    }
    [self setText:[NSString stringWithUTF8String:text.c_str()] ?: @""];
  }
}

#pragma mark - Props

// the font and color of typed text, taken from the prop attributes
- (void)applyTextAttributes
{
  const auto &props = [self textInputProps];
  AttributedString probe;
  auto attributes = props.getEffectiveTextAttributes(1);
  probe.setBaseTextAttributes(attributes);
  probe.appendFragment({.string = " ", .textAttributes = attributes, .parentShadowView = {}});
  NSTextStorage *storage = OneMacosTextStorage(probe, ParagraphAttributes{}, CGSizeMake(10000, 10000));
  NSDictionary *typing = [storage attributesAtIndex:0 effectiveRange:nil];

  NSColor *placeholderColor = OneMacosColorFromSharedColor(props.placeholderTextColor) ?: NSColor.placeholderTextColor;
  NSMutableDictionary *placeholderAttributes = [typing mutableCopy];
  placeholderAttributes[NSForegroundColorAttributeName] = placeholderColor;
  NSAttributedString *placeholder =
      [[NSAttributedString alloc] initWithString:[NSString stringWithUTF8String:props.placeholder.c_str()] ?: @""
                                      attributes:placeholderAttributes];

  if (_textView) {
    _textView.typingAttributes = typing;
    if (_textView.textStorage.length > 0) {
      [_textView.textStorage setAttributes:typing range:NSMakeRange(0, _textView.textStorage.length)];
    }
    _textView.font = typing[NSFontAttributeName];
    _textView.placeholder = placeholder;
  } else {
    _field.font = typing[NSFontAttributeName];
    _field.textColor = typing[NSForegroundColorAttributeName];
    NSParagraphStyle *paragraph = typing[NSParagraphStyleAttributeName];
    _field.alignment = paragraph ? paragraph.alignment : NSTextAlignmentNatural;
    _field.placeholderAttributedString = placeholder;
  }
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  [super updateProps:props oldProps:oldProps];
  const auto &textProps = static_cast<const TextInputProps &>(*props);
  const auto &traits = textProps.traits;
  [self installEditorForMultiline:textProps.multiline secure:traits.secureTextEntry];

  BOOL editable = traits.editable && !textProps.readOnly;
  if (_textView) {
    _textView.editable = editable;
    _textView.selectable = YES;
    _textView.continuousSpellCheckingEnabled = traits.spellCheck.value_or(false);
    _textView.automaticSpellingCorrectionEnabled = traits.autoCorrect.value_or(false);
    if (NSColor *cursor = OneMacosColorFromSharedColor(textProps.cursorColor)) {
      _textView.insertionPointColor = cursor;
    }
    if (NSColor *selection = OneMacosColorFromSharedColor(textProps.selectionColor)) {
      _textView.selectedTextAttributes = @{NSBackgroundColorAttributeName : selection};
    }
  } else {
    _field.editable = editable;
    _field.selectable = YES;
  }
  [self applyTextAttributes];

  if (textProps.selection) {
    [self setSelection:NSMakeRange(
                           MAX(textProps.selection->start, 0),
                           MAX(textProps.selection->end - textProps.selection->start, 0))];
  }
}

- (void)updateLayoutMetrics:(const LayoutMetrics &)layoutMetrics oldLayoutMetrics:(const LayoutMetrics &)oldLayoutMetrics
{
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  const auto &content = layoutMetrics.getContentFrame();
  NSRect frame = NSMakeRect(content.origin.x, content.origin.y, content.size.width, content.size.height);
  if (_scrollView) {
    _scrollView.frame = frame;
    // the document is at least the viewport tall, so an empty area below the text still takes clicks
    _textView.minSize = NSMakeSize(0, content.size.height);
    _textView.frame = NSMakeRect(0, 0, content.size.width, MAX(_textView.frame.size.height, content.size.height));
    _textView.textContainer.containerSize = NSMakeSize(content.size.width, CGFLOAT_MAX);
  } else {
    _field.frame = frame;
  }
}

- (void)finalizeUpdates:(OneMacosUpdateMask)updateMask
{
  [super finalizeUpdates:updateMask];
  if (!_didAutoFocus && self.props && [self textInputProps].autoFocus) {
    _didAutoFocus = YES;
    __weak OneMacosTextInputComponentView *weakSelf = self;
    dispatch_async(dispatch_get_main_queue(), ^{
      [weakSelf focusEditor];
    });
  }
}

- (void)focusEditor
{
  [self.window makeFirstResponder:_textView ?: (NSResponder *)_field];
}

#pragma mark - Commands

- (void)handleCommand:(const std::string &)commandName args:(const folly::dynamic &)args
{
  if (commandName == "focus") {
    [self focusEditor];
  } else if (commandName == "blur") {
    if ([self activeEditor] && self.window.firstResponder == [self activeEditor]) {
      [self.window makeFirstResponder:nil];
    }
  } else if (commandName == "setTextAndSelection" && args.size() >= 4) {
    if (args[0].asInt() < _mostRecentEventCount) {
      return;
    }
    if (args[1].isString()) {
      [self setText:[NSString stringWithUTF8String:args[1].asString().c_str()] ?: @""];
    }
    NSInteger start = args[2].asInt();
    NSInteger end = args[3].asInt();
    if (start >= 0 && end >= 0) {
      [self setSelection:NSMakeRange(start, MAX(end - start, 0))];
    }
  }
}

- (void)dealloc
{
  if (_selectionObserver) {
    [NSNotificationCenter.defaultCenter removeObserver:_selectionObserver];
  }
}

@end
