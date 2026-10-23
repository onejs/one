#import "OneMacosSymbolImageComponentView.h"
#import "OneMacosText.h"
#include <OneMacImage/OneMacImageProps.h>

using namespace facebook::react;

@implementation OneMacosSymbolImageComponentView {
  NSImageView *_imageView;
}

- (instancetype)initWithFrame:(NSRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _imageView = [[NSImageView alloc] initWithFrame:self.bounds];
    _imageView.imageScaling = NSImageScaleProportionallyUpOrDown;
    _imageView.imageAlignment = NSImageAlignCenter;
    _imageView.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    [_imageView setAccessibilityElement:NO];
    [_imageView setAccessibilityHidden:YES];
    [self setAccessibilityChildren:@[]];
    [self addSubview:_imageView];
  }
  return self;
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  [super updateProps:props oldProps:oldProps];
  const auto &value = static_cast<const OneMacImageProps &>(*props);
  NSImage *image = [NSImage imageWithSystemSymbolName:[NSString stringWithUTF8String:value.systemName.c_str()] accessibilityDescription:nil];
  _imageView.image = [image imageWithSymbolConfiguration:[NSImageSymbolConfiguration configurationWithPointSize:value.size weight:NSFontWeightRegular]];
  _imageView.contentTintColor = value.tintColor ? OneMacosColorFromSharedColor(value.tintColor) : NSColor.labelColor;
}

// the base view implements press for interactive react views; images have no action.
- (BOOL)isAccessibilitySelectorAllowed:(SEL)selector
{
  if (selector == @selector(accessibilityPerformPress)) return NO;
  return [super isAccessibilitySelectorAllowed:selector];
}

- (void)updateLayoutMetrics:(const LayoutMetrics &)metrics oldLayoutMetrics:(const LayoutMetrics &)oldMetrics
{
  [super updateLayoutMetrics:metrics oldLayoutMetrics:oldMetrics];
  _imageView.frame = self.bounds;
}
@end
