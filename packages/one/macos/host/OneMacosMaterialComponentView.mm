#import "OneMacosMaterialComponentView.h"
#include <OneMacMaterial/OneMacMaterialProps.h>

using namespace facebook::react;

// a native system material behind a region of the React tree. `glass` and
// `glassClear` are Liquid Glass (NSGlassEffectView, macOS 26); the rest are
// NSVisualEffectView materials. React siblings drawn after it sit over it, and it
// takes no pointer input of its own (the JS wrapper sets pointerEvents none).
@implementation OneMacosMaterialComponentView {
  NSView *_effect;
  NSString *_kind;
}

- (instancetype)initWithFrame:(NSRect)frame
{
  if (self = [super initWithFrame:frame]) {
    [self setAccessibilityElement:NO];
  }
  return self;
}

static NSVisualEffectMaterial visualMaterial(NSString *name)
{
  if ([name isEqualToString:@"content"]) return NSVisualEffectMaterialContentBackground;
  if ([name isEqualToString:@"headerView"]) return NSVisualEffectMaterialHeaderView;
  if ([name isEqualToString:@"menu"]) return NSVisualEffectMaterialMenu;
  if ([name isEqualToString:@"underWindow"]) return NSVisualEffectMaterialUnderWindowBackground;
  if ([name isEqualToString:@"window"]) return NSVisualEffectMaterialWindowBackground;
  return NSVisualEffectMaterialSidebar;
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  [super updateProps:props oldProps:oldProps];
  const auto &value = static_cast<const OneMacMaterialProps &>(*props);
  NSString *material = [NSString stringWithUTF8String:value.material.c_str()];
  BOOL glass = [material hasPrefix:@"glass"];
  if (glass && @available(macOS 26.0, *)) {
    if (![_kind isEqualToString:@"glass"]) {
      [_effect removeFromSuperview];
      _effect = [[NSGlassEffectView alloc] initWithFrame:self.bounds];
      _kind = @"glass";
      [self addSubview:_effect];
    }
    auto *view = (NSGlassEffectView *)_effect;
    view.style = [material isEqualToString:@"glassClear"] ? NSGlassEffectViewStyleClear : NSGlassEffectViewStyleRegular;
    view.cornerRadius = value.cornerRadius;
  } else {
    if (![_kind isEqualToString:@"visual"]) {
      [_effect removeFromSuperview];
      _effect = [[NSVisualEffectView alloc] initWithFrame:self.bounds];
      _kind = @"visual";
      [self addSubview:_effect];
    }
    auto *view = (NSVisualEffectView *)_effect;
    view.material = visualMaterial(glass ? @"sidebar" : material);
    view.blendingMode = value.blending == "withinWindow" ? NSVisualEffectBlendingModeWithinWindow : NSVisualEffectBlendingModeBehindWindow;
    view.state = NSVisualEffectStateActive;
    view.wantsLayer = YES;
    view.layer.cornerRadius = value.cornerRadius;
    view.layer.masksToBounds = value.cornerRadius > 0;
  }
  _effect.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
}

- (void)updateLayoutMetrics:(const LayoutMetrics &)metrics oldLayoutMetrics:(const LayoutMetrics &)oldMetrics
{
  [super updateLayoutMetrics:metrics oldLayoutMetrics:oldMetrics];
  _effect.frame = self.bounds;
}
@end
