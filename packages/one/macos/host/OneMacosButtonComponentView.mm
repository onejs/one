#import "OneMacosButtonComponentView.h"
#import "OneMacosControlsHosting.h"
#include <OneMacButton/OneMacButtonEventEmitter.h>
#include <OneMacButton/OneMacButtonProps.h>

using namespace facebook::react;

@implementation OneMacosButtonComponentView {
  NSView<OneMacosButtonHosting> *_host;
}

- (instancetype)initWithFrame:(NSRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _host = [[NSClassFromString(@"OneMacButtonHostView") alloc] initWithFrame:self.bounds];
    NSAssert(_host, @"add host/swift/OneMacControls.swift to the app target");
    _host.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    __weak OneMacosButtonComponentView *weakSelf = self;
    _host.onPress = ^{
      auto emitter = std::static_pointer_cast<const OneMacButtonEventEmitter>(weakSelf.eventEmitter);
      if (emitter) emitter->onPress({});
    };
    [self addSubview:_host];
    [self setAccessibilityElement:NO];
  }
  return self;
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  [super updateProps:props oldProps:oldProps];
  const auto &value = static_cast<const OneMacButtonProps &>(*props);
  _host.title = [NSString stringWithUTF8String:value.title.c_str()];
  _host.systemImage = [NSString stringWithUTF8String:value.systemImage.c_str()];
  _host.disabled = value.disabled;
  [self setAccessibilityElement:NO];
  NSView *button = _host.subviews.firstObject;
  [button setAccessibilityLabel:value.accessibilityLabel.empty() ? _host.title : [NSString stringWithUTF8String:value.accessibilityLabel.c_str()]];
  [button setAccessibilityHelp:[NSString stringWithUTF8String:value.accessibilityHint.c_str()]];
  [button setAccessibilityIdentifier:[NSString stringWithUTF8String:value.testId.c_str()]];
}

- (BOOL)accessibilityPerformPress
{
  return [_host accessibilityPerformPress];
}

- (void)updateLayoutMetrics:(const LayoutMetrics &)metrics oldLayoutMetrics:(const LayoutMetrics &)oldMetrics
{
  [super updateLayoutMetrics:metrics oldLayoutMetrics:oldMetrics];
  _host.frame = self.bounds;
}
@end
