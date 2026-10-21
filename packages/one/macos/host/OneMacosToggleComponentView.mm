#import "OneMacosToggleComponentView.h"

#import "OneMacosToggleHosting.h"

#include <OneMacToggle/OneMacToggleEventEmitter.h>
#include <OneMacToggle/OneMacToggleProps.h>

using namespace facebook::react;

// The controlled round trip lives in Swift (OneNativeControlled, shared with
// iOS); this view forwards props in and the native event out.
@implementation OneMacosToggleComponentView {
  NSView<OneMacosToggleHosting> *_host;
}

- (instancetype)initWithFrame:(NSRect)frame
{
  if (self = [super initWithFrame:frame]) {
    Class hostClass = NSClassFromString(@"OneMacToggleHostView");
    if (!hostClass) {
      [NSException raise:NSInternalInconsistencyException
                  format:@"OneMacToggleHostView is missing; add host/swift/OneMacToggle.swift to the app target"];
    }
    _host = [[hostClass alloc] initWithFrame:self.bounds];
    _host.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    __weak OneMacosToggleComponentView *weakSelf = self;
    _host.onChange = ^(BOOL isOn, NSInteger eventCount, NSInteger revision) {
      [weakSelf userDidChange:isOn eventCount:eventCount revision:revision];
    };
    [self addSubview:_host];
  }
  return self;
}

- (void)userDidChange:(BOOL)isOn eventCount:(NSInteger)eventCount revision:(NSInteger)revision
{
  auto emitter = std::static_pointer_cast<const OneMacToggleEventEmitter>(self.eventEmitter);
  if (emitter) {
    emitter->onIsOnChange({.isOn = (bool)isOn, .eventCount = (int)eventCount, .revision = (int)revision});
  }
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  [super updateProps:props oldProps:oldProps];
  const auto &toggleProps = static_cast<const OneMacToggleProps &>(*props);
  _host.label = [NSString stringWithUTF8String:toggleProps.label.c_str()];
  [_host applyValue:toggleProps.isOn acknowledged:toggleProps.acknowledgedEvent revision:toggleProps.revision];
}

- (void)updateLayoutMetrics:(const LayoutMetrics &)layoutMetrics oldLayoutMetrics:(const LayoutMetrics &)oldLayoutMetrics
{
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  _host.frame = self.bounds;
}

@end
