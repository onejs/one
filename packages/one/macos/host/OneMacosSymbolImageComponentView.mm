#import "OneMacosSymbolImageComponentView.h"
#import "OneMacosText.h"
#include <OneMacImage/OneMacImageProps.h>

using namespace facebook::react;

@implementation OneMacosSymbolImageComponentView {
  NSImageView *_imageView;
  BOOL _fitToBounds;
  NSString *_systemName;
  Float _symbolSize;
}

- (instancetype)initWithFrame:(NSRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _imageView = [[NSImageView alloc] initWithFrame:self.bounds];
    _imageView.imageScaling = NSImageScaleNone;
    _imageView.imageAlignment = NSImageAlignCenter;
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
  NSString *systemName = [NSString stringWithUTF8String:value.systemName.c_str()];
  if (![_systemName isEqualToString:systemName] || _symbolSize != value.size) {
    _systemName = [systemName copy];
    _symbolSize = value.size;
    NSImage *image = [NSImage imageWithSystemSymbolName:systemName accessibilityDescription:nil];
    _imageView.image = [image imageWithSymbolConfiguration:[NSImageSymbolConfiguration configurationWithPointSize:value.size weight:NSFontWeightRegular]];
  }
  _fitToBounds = value.fitToBounds;
  _imageView.imageScaling = _fitToBounds ? NSImageScaleProportionallyUpOrDown : NSImageScaleNone;
  [self layoutImage];
  _imageView.contentTintColor = value.tintColor ? OneMacosColorFromSharedColor(value.tintColor) : NSColor.labelColor;
}

// allow the natural glyph to extend beyond the default square layout.
- (BOOL)wantsDefaultClipping { return NO; }

- (void)layoutImage
{
  NSSize size = _fitToBounds ? self.bounds.size : _imageView.image.size;
  _imageView.frame = NSMakeRect((self.bounds.size.width - size.width) / 2,
      (self.bounds.size.height - size.height) / 2, size.width, size.height);
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
  [self layoutImage];
}
@end
