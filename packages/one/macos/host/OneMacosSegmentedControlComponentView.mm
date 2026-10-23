#import "OneMacosSegmentedControlComponentView.h"
#import "OneMacosControlsHosting.h"
#include <OneMacSegmentedControl/OneMacSegmentedControlEventEmitter.h>
#include <OneMacSegmentedControl/OneMacSegmentedControlProps.h>

using namespace facebook::react;

@implementation OneMacosSegmentedControlComponentView {
  NSView<OneMacosSegmentedControlHosting> *_host;
}

- (instancetype)initWithFrame:(NSRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _host = [[NSClassFromString(@"OneMacSegmentedControlHostView") alloc] initWithFrame:self.bounds];
    NSAssert(_host, @"add host/swift/OneMacControls.swift to the app target");
    _host.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    __weak OneMacosSegmentedControlComponentView *weakSelf = self;
    _host.onChange = ^(NSInteger index, NSInteger count, NSInteger revision) {
      auto emitter = std::static_pointer_cast<const OneMacSegmentedControlEventEmitter>(weakSelf.eventEmitter);
      if (emitter) emitter->onChange({(int)index, (int)count, (int)revision});
    };
    [self addSubview:_host];
    [self setAccessibilityElement:NO];
  }
  return self;
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  [super updateProps:props oldProps:oldProps];
  const auto &value = static_cast<const OneMacSegmentedControlProps &>(*props);
  NSMutableArray<NSString *> *labels = [NSMutableArray new];
  for (const auto &label : value.labels) [labels addObject:[NSString stringWithUTF8String:label.c_str()]];
  _host.labels = labels;
  _host.controlRole = [NSString stringWithUTF8String:value.controlRole.c_str()];
  _host.disabled = value.disabled;
  [_host applyValue:value.selectedIndex acknowledged:value.acknowledgedEvent revision:value.revision];
  [self setAccessibilityElement:NO];
  NSView *control = _host.subviews.firstObject;
  [control setAccessibilityLabel:[NSString stringWithUTF8String:value.accessibilityLabel.c_str()]];
  [control setAccessibilityHelp:[NSString stringWithUTF8String:value.accessibilityHint.c_str()]];
  [control setAccessibilityIdentifier:[NSString stringWithUTF8String:value.testId.c_str()]];
}

- (void)updateLayoutMetrics:(const LayoutMetrics &)metrics oldLayoutMetrics:(const LayoutMetrics &)oldMetrics
{
  [super updateLayoutMetrics:metrics oldLayoutMetrics:oldMetrics];
  _host.frame = self.bounds;
}
@end
