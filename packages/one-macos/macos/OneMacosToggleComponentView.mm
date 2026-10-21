#import "OneMacosToggleComponentView.h"

#import "OneMacosToggleHosting.h"

#include <OneMacToggle/OneMacToggleEventEmitter.h>
#include <OneMacToggle/OneMacToggleProps.h>

using namespace facebook::react;

// The controlled round trip: native applies a user toggle immediately and sends
// an event numbered with `eventCount`. React answers by re-rendering with
// `acknowledgedEvent`. Until the acknowledgement reaches the latest event, the
// native value wins over props, so a slow round trip never flips the control
// back. A new `revision` starts the count over.
@implementation OneMacosToggleComponentView {
  NSView<OneMacosToggleHosting> *_host;
  int _revision;
  int _eventCount;
  BOOL _isOn;
}

- (instancetype)initWithFrame:(NSRect)frame
{
  if (self = [super initWithFrame:frame]) {
    Class hostClass = NSClassFromString(@"OneMacToggleHostView");
    if (!hostClass) {
      [NSException raise:NSInternalInconsistencyException
                  format:@"OneMacToggleHostView is missing; add macos/swift/OneMacToggle.swift to the app target"];
    }
    _host = [[hostClass alloc] initWithFrame:self.bounds];
    _host.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    __weak OneMacosToggleComponentView *weakSelf = self;
    _host.onChange = ^(BOOL isOn) {
      [weakSelf userDidChange:isOn];
    };
    [self addSubview:_host];
  }
  return self;
}

- (void)userDidChange:(BOOL)isOn
{
  _isOn = isOn;
  _eventCount += 1;
  auto emitter = std::static_pointer_cast<const OneMacToggleEventEmitter>(self.eventEmitter);
  if (emitter) {
    emitter->onIsOnChange({.isOn = (bool)isOn, .eventCount = _eventCount, .revision = _revision});
  }
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  [super updateProps:props oldProps:oldProps];
  const auto &toggleProps = static_cast<const OneMacToggleProps &>(*props);

  if (!oldProps || toggleProps.revision != _revision) {
    _revision = toggleProps.revision;
    _eventCount = 0;
    _isOn = toggleProps.isOn;
  } else if (toggleProps.acknowledgedEvent >= _eventCount) {
    _isOn = toggleProps.isOn;
  }

  _host.label = [NSString stringWithUTF8String:toggleProps.label.c_str()];
  _host.isOn = _isOn;
}

- (void)updateLayoutMetrics:(const LayoutMetrics &)layoutMetrics oldLayoutMetrics:(const LayoutMetrics &)oldLayoutMetrics
{
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  _host.frame = self.bounds;
}

@end
