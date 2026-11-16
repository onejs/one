#import "OneMacosTextInputComponentView.h"
#import "OneMacosTextInputHosting.h"
#import "OneMacosText.h"
#include <react/renderer/components/iostextinput/TextInputProps.h>
#include <react/renderer/components/iostextinput/TextInputShadowNode.h>
#include <react/renderer/components/textinput/TextInputEventEmitter.h>
using namespace facebook::react;

@implementation OneMacosTextInputComponentView {
  OneMacosTextInputHostView* _input;
  TextInputShadowNode::ConcreteState::Shared _state;
}
- (BOOL)acceptsFirstResponder { return NO; }
- (void)ensureInput {
  if (_input) return;
  _input = [OneMacosTextInputHostView new];
  __weak OneMacosTextInputComponentView* weak = self;
  _input.onEvent = ^(NSString* name, NSDictionary* payload) { [weak event:name payload:payload]; };
  [self addSubview:_input];
}
- (void)event:(NSString*)name payload:(NSDictionary*)payload {
  auto emitter = std::static_pointer_cast<const TextInputEventEmitter>(self.eventEmitter);
  if ([name isEqualToString:@"change"]) [self updateStateWithCurrentText];
  if (!emitter) return;
  TextInputEventEmitter::Metrics metrics;
  metrics.text = [payload[@"text"] UTF8String] ?: "";
  NSDictionary* selection = payload[@"selection"], *content = payload[@"contentSize"], *container = payload[@"layoutMeasurement"], *offset = payload[@"contentOffset"];
  metrics.selectionRange = {[selection[@"start"] intValue], [selection[@"end"] intValue] - [selection[@"start"] intValue]};
  metrics.contentSize = {(Float)[content[@"width"] doubleValue], (Float)[content[@"height"] doubleValue]};
  metrics.containerSize = {(Float)[container[@"width"] doubleValue], (Float)[container[@"height"] doubleValue]};
  metrics.layoutMeasurement = metrics.containerSize;
  metrics.contentOffset = {(Float)[offset[@"x"] doubleValue], (Float)[offset[@"y"] doubleValue]};
  metrics.eventCount = [payload[@"eventCount"] intValue]; metrics.zoomScale = 1; metrics.target = self.reactTag;
  if ([name isEqualToString:@"focus"]) emitter->onFocus(metrics);
  else if ([name isEqualToString:@"blur"]) emitter->onBlur(metrics);
  else if ([name isEqualToString:@"endEditing"]) emitter->onEndEditing(metrics);
  else if ([name isEqualToString:@"change"]) emitter->onChange(metrics);
  else if ([name isEqualToString:@"selectionChange"]) emitter->onSelectionChange(metrics);
  else if ([name isEqualToString:@"contentSizeChange"]) emitter->onContentSizeChange(metrics);
  else if ([name isEqualToString:@"submitEditing"]) emitter->onSubmitEditing(metrics);
  else if ([name isEqualToString:@"keyPress"]) emitter->onKeyPress({[payload[@"key"] UTF8String] ?: "", metrics.eventCount});
}
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
  text.appendFragment({.string = _input.text.UTF8String ?: "", .textAttributes = base, .parentShadowView = parent});
  _state->updateState(TextInputState{
      AttributedStringBox{text}, data.reactTreeAttributedString, data.paragraphAttributes, _input.eventCount});
}

- (void)updateState:(const State::Shared &)state oldState:(const State::Shared &)oldState
{
  _state = std::static_pointer_cast<const TextInputShadowNode::ConcreteState>(state);
  const auto &data = _state->getData();
  if (_input.eventCount != data.mostRecentEventCount) {
    return;
  }
  if (data.attributedStringBox.getMode() == AttributedStringBox::Mode::Value) {
    const auto &string = data.attributedStringBox.getValue();
    std::string text;
    for (const auto &fragment : string.getFragments()) {
      text += fragment.string;
    }
    [_input applyText:[NSString stringWithUTF8String:text.c_str()] ?: @"" eventCount:data.mostRecentEventCount];
  }
}


- (void)updateProps:(const Props::Shared&)props oldProps:(const Props::Shared&)oldProps {
  [super updateProps:props oldProps:oldProps];
  [self ensureInput];
  const auto& text = static_cast<const TextInputProps&>(*props);
  const auto& traits = text.traits;
  AttributedString probe;
  const auto attributes = text.getEffectiveTextAttributes(1);
  probe.setBaseTextAttributes(attributes);
  probe.appendFragment({.string = " ", .textAttributes = attributes, .parentShadowView = {}});
  NSTextStorage* storage = OneMacosTextStorage(probe, ParagraphAttributes{}, CGSizeMake(10000,10000));
  NSMutableDictionary* config = [@{@"multiline": @(text.multiline), @"secureTextEntry": @(traits.secureTextEntry),
    @"editable": @(traits.editable), @"readOnly": @(text.readOnly), @"spellCheck": @(traits.spellCheck.value_or(false)),
    @"autoCorrect": @(traits.autoCorrect.value_or(false)), @"maxLength": @(text.maxLength), @"autoFocus": @(text.autoFocus),
    @"placeholder": [NSString stringWithUTF8String:text.placeholder.c_str()] ?: @"",
    @"submitBehavior": text.submitBehavior == SubmitBehavior::Submit ? @"submit" : text.submitBehavior == SubmitBehavior::BlurAndSubmit ? @"blurAndSubmit" : text.submitBehavior == SubmitBehavior::Newline ? @"newline" : @"default",
    @"mostRecentEventCount": @(_input.eventCount)} mutableCopy];
  if (NSColor* color = OneMacosColorFromSharedColor(text.placeholderTextColor)) config[@"placeholderTextColor"] = color;
  if (NSColor* color = OneMacosColorFromSharedColor(text.cursorColor)) config[@"cursorColor"] = color;
  if (NSColor* color = OneMacosColorFromSharedColor(text.selectionColor)) config[@"selectionColor"] = color;
  if (text.selection) config[@"selection"] = @{@"start": @(text.selection->start), @"end": @(text.selection->end)};
  [_input configure:config attributes:[storage attributesAtIndex:0 effectiveRange:nil]];
}
- (void)updateLayoutMetrics:(const LayoutMetrics&)metrics oldLayoutMetrics:(const LayoutMetrics&)old {
  [super updateLayoutMetrics:metrics oldLayoutMetrics:old];
  const auto& content = metrics.getContentFrame();
  _input.frame = NSMakeRect(content.origin.x, content.origin.y, content.size.width, content.size.height);
}
- (void)handleCommand:(const std::string&)name args:(const folly::dynamic&)args {
  NSMutableArray* values = [NSMutableArray array];
  if (name == "setTextAndSelection" && args.size() >= 4) {
    [values addObject:@(args[0].asInt())];
    [values addObject:args[1].isString() ? [NSString stringWithUTF8String:args[1].asString().c_str()] : NSNull.null];
    [values addObject:@(args[2].asInt())]; [values addObject:@(args[3].asInt())];
  }
  [_input command:[NSString stringWithUTF8String:name.c_str()] args:values];
}
@end
