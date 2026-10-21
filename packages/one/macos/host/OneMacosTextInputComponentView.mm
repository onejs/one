#import "OneMacosTextInputComponentView.h"

#include <react/renderer/components/iostextinput/TextInputComponentDescriptor.h>
#include <react/renderer/components/iostextinput/TextInputProps.h>
#include <react/renderer/components/iostextinput/TextInputShadowNode.h>
#include <react/renderer/components/textinput/TextInputEventEmitter.h>

#import "OneMacosText.h"

using namespace facebook::react;

@class OneMacosTextInputComponentView;

@interface OneMacosTextInputComponentView ()
- (void)textViewDidFocus;
- (void)textViewDidBlur;
- (void)textViewKeyDown:(NSEvent *)event;
@end

// reports focus and key presses back to its component view and draws the
// placeholder, which NSTextView has no notion of
@interface OneMacosTextView : NSTextView
@property (nonatomic, weak) OneMacosTextInputComponentView *owner;
@property (nonatomic, copy) NSAttributedString *placeholder;
@end

@implementation OneMacosTextView

- (BOOL)becomeFirstResponder
{
  BOOL result = [super becomeFirstResponder];
  if (result) {
    [_owner textViewDidFocus];
  }
  return result;
}

- (BOOL)resignFirstResponder
{
  BOOL result = [super resignFirstResponder];
  if (result) {
    [_owner textViewDidBlur];
  }
  return result;
}

- (void)keyDown:(NSEvent *)event
{
  [_owner textViewKeyDown:event];
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

@interface OneMacosTextInputComponentView () <NSTextViewDelegate>
@end

@implementation OneMacosTextInputComponentView {
  OneMacosTextView *_textView;
  TextInputShadowNode::ConcreteState::Shared _state;
  int64_t _mostRecentEventCount;
  BOOL _comingFromJS;
  BOOL _didAutoFocus;
  NSSize _lastContentSize;
}

- (instancetype)initWithFrame:(NSRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _textView = [[OneMacosTextView alloc] initWithFrame:NSZeroRect];
    _textView.owner = self;
    _textView.delegate = self;
    _textView.drawsBackground = NO;
    _textView.richText = NO;
    _textView.allowsUndo = YES;
    _textView.textContainerInset = NSZeroSize;
    _textView.textContainer.lineFragmentPadding = 0;
    _textView.horizontallyResizable = NO;
    _textView.verticallyResizable = NO;
    _textView.automaticQuoteSubstitutionEnabled = NO;
    _textView.automaticDashSubstitutionEnabled = NO;
    _textView.automaticTextReplacementEnabled = NO;
    [self addSubview:_textView];
  }
  return self;
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

#pragma mark - Metrics and events

- (NSSize)usedTextSize
{
  [_textView.layoutManager ensureLayoutForTextContainer:_textView.textContainer];
  NSRect used = [_textView.layoutManager usedRectForTextContainer:_textView.textContainer];
  return used.size;
}

- (TextInputEventEmitter::Metrics)metrics
{
  TextInputEventEmitter::Metrics metrics;
  metrics.text = _textView.string.UTF8String ?: "";
  NSRange selection = _textView.selectedRange;
  metrics.selectionRange = {(int)selection.location, (int)selection.length};
  NSSize content = [self usedTextSize];
  metrics.contentSize = {(Float)content.width, (Float)content.height};
  metrics.containerSize = {(Float)_textView.frame.size.width, (Float)_textView.frame.size.height};
  metrics.layoutMeasurement = metrics.containerSize;
  metrics.eventCount = (int)_mostRecentEventCount;
  metrics.zoomScale = 1;
  metrics.target = self.reactTag;
  return metrics;
}

- (void)textViewDidFocus
{
  if (auto emitter = [self textInputEmitter]) {
    emitter->onFocus([self metrics]);
  }
}

- (void)textViewDidBlur
{
  if (auto emitter = [self textInputEmitter]) {
    emitter->onEndEditing([self metrics]);
    emitter->onBlur([self metrics]);
  }
}

- (void)textViewKeyDown:(NSEvent *)event
{
  auto emitter = [self textInputEmitter];
  if (!emitter) {
    return;
  }
  NSString *characters = event.characters;
  std::string key = characters.UTF8String ?: "";
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
- (void)textDidChange:(NSNotification *)notification
{
  if (_comingFromJS) {
    return;
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

- (void)textViewDidChangeSelection:(NSNotification *)notification
{
  if (_comingFromJS) {
    return;
  }
  if (auto emitter = [self textInputEmitter]) {
    emitter->onSelectionChange([self metrics]);
  }
}

- (BOOL)textView:(NSTextView *)textView shouldChangeTextInRange:(NSRange)range replacementString:(NSString *)string
{
  if (_comingFromJS || !self.props || !string) {
    return YES;
  }
  NSInteger maxLength = [self textInputProps].maxLength;
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
  text.appendFragment({.string = _textView.string.UTF8String ?: "", .textAttributes = base, .parentShadowView = parent});
  _state->updateState(TextInputState{
      AttributedStringBox{text}, data.reactTreeAttributedString, data.paragraphAttributes, _mostRecentEventCount});
}

- (void)setText:(NSString *)text
{
  if ([_textView.string isEqualToString:text]) {
    return;
  }
  NSRange selection = _textView.selectedRange;
  _comingFromJS = YES;
  [_textView.textStorage replaceCharactersInRange:NSMakeRange(0, _textView.string.length) withString:text];
  [_textView setTypingAttributes:_textView.typingAttributes];
  _textView.selectedRange = NSMakeRange(MIN(selection.location, text.length), 0);
  _comingFromJS = NO;
  [self applyTextAttributes];
  [_textView setNeedsDisplay:YES];
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

// the font and color of typed text, taken from the first fragment's attributes
- (void)applyTextAttributes
{
  const auto &props = [self textInputProps];
  AttributedString probe;
  auto attributes = props.getEffectiveTextAttributes(1);
  probe.setBaseTextAttributes(attributes);
  probe.appendFragment({.string = " ", .textAttributes = attributes, .parentShadowView = {}});
  NSTextStorage *storage = OneMacosTextStorage(probe, ParagraphAttributes{}, CGSizeMake(10000, 10000));
  NSDictionary *typing = [storage attributesAtIndex:0 effectiveRange:nil];
  _textView.typingAttributes = typing;
  if (_textView.textStorage.length > 0) {
    [_textView.textStorage setAttributes:typing range:NSMakeRange(0, _textView.textStorage.length)];
  }
  _textView.font = typing[NSFontAttributeName];

  NSMutableDictionary *placeholderAttributes = [typing mutableCopy];
  NSColor *placeholderColor = OneMacosColorFromSharedColor(props.placeholderTextColor) ?: NSColor.placeholderTextColor;
  placeholderAttributes[NSForegroundColorAttributeName] = placeholderColor;
  _textView.placeholder = [[NSAttributedString alloc] initWithString:[NSString stringWithUTF8String:props.placeholder.c_str()] ?: @""
                                                          attributes:placeholderAttributes];
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  [super updateProps:props oldProps:oldProps];
  const auto &textProps = static_cast<const TextInputProps &>(*props);
  const auto &traits = textProps.traits;
  _textView.editable = traits.editable && !textProps.readOnly;
  _textView.selectable = YES;
  _textView.continuousSpellCheckingEnabled = traits.spellCheck.value_or(false);
  _textView.automaticSpellingCorrectionEnabled = traits.autoCorrect.value_or(false);
  if (NSColor *cursor = OneMacosColorFromSharedColor(textProps.cursorColor)) {
    _textView.insertionPointColor = cursor;
  }
  if (NSColor *selection = OneMacosColorFromSharedColor(textProps.selectionColor)) {
    _textView.selectedTextAttributes = @{NSBackgroundColorAttributeName : selection};
  }
  bool multiline = textProps.multiline;
  _textView.textContainer.widthTracksTextView = NO;
  _textView.textContainer.heightTracksTextView = NO;
  _textView.textContainer.lineBreakMode = multiline ? NSLineBreakByWordWrapping : NSLineBreakByClipping;
  [self applyTextAttributes];

  if (textProps.selection && !_comingFromJS) {
    NSInteger length = _textView.string.length;
    NSInteger start = MIN(MAX(textProps.selection->start, 0), length);
    NSInteger end = MIN(MAX(textProps.selection->end, start), length);
    if (_textView.selectedRange.location != (NSUInteger)start || _textView.selectedRange.length != (NSUInteger)(end - start)) {
      _comingFromJS = YES;
      _textView.selectedRange = NSMakeRange(start, end - start);
      _comingFromJS = NO;
    }
  }
}

- (void)updateLayoutMetrics:(const LayoutMetrics &)layoutMetrics oldLayoutMetrics:(const LayoutMetrics &)oldLayoutMetrics
{
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  const auto &content = layoutMetrics.getContentFrame();
  _textView.frame = NSMakeRect(content.origin.x, content.origin.y, content.size.width, content.size.height);
  bool multiline = [self textInputProps].multiline;
  _textView.textContainer.containerSize =
      NSMakeSize(multiline ? content.size.width : CGFLOAT_MAX, multiline ? CGFLOAT_MAX : content.size.height);
}

- (void)finalizeUpdates:(OneMacosUpdateMask)updateMask
{
  [super finalizeUpdates:updateMask];
  if (!_didAutoFocus && self.props && [self textInputProps].autoFocus) {
    _didAutoFocus = YES;
    __weak OneMacosTextInputComponentView *weakSelf = self;
    dispatch_async(dispatch_get_main_queue(), ^{
      OneMacosTextInputComponentView *strongSelf = weakSelf;
      [strongSelf->_textView.window makeFirstResponder:strongSelf->_textView];
    });
  }
}

#pragma mark - Commands

- (void)handleCommand:(const std::string &)commandName args:(const folly::dynamic &)args
{
  if (commandName == "focus") {
    [_textView.window makeFirstResponder:_textView];
  } else if (commandName == "blur") {
    if (_textView.window.firstResponder == _textView) {
      [_textView.window makeFirstResponder:nil];
    }
  } else if (commandName == "setTextAndSelection" && args.size() >= 4) {
    if (args[0].asInt() < _mostRecentEventCount) {
      return;
    }
    if (args[1].isString()) {
      [self setText:[NSString stringWithUTF8String:args[1].asString().c_str()] ?: @""];
    }
    NSInteger length = _textView.string.length;
    NSInteger start = args[2].asInt();
    NSInteger end = args[3].asInt();
    if (start >= 0 && end >= 0) {
      _comingFromJS = YES;
      _textView.selectedRange = NSMakeRange(MIN(start, length), MIN(MAX(end, start), length) - MIN(start, length));
      _comingFromJS = NO;
    }
  }
}

@end
