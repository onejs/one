#import "HostPlatformColor.h"

#import <AppKit/AppKit.h>
#import <objc/message.h>

namespace facebook::react {

namespace {

NSColor *NSColorFromPlatformColor(const std::shared_ptr<void> &platformColor)
{
  return (__bridge NSColor *)platformColor.get();
}

std::shared_ptr<void> PlatformColorFromNSColor(NSColor *color)
{
  return std::shared_ptr<void>((void *)CFBridgingRetain(color), CFRelease);
}

// an app asset catalog color first, then an NSColor class getter such as
// labelColor, accepting both "label" and "labelColor" like iOS PlatformColor
NSColor *NSColorFromSemanticName(const std::string &name)
{
  NSString *string = [NSString stringWithUTF8String:name.c_str()];
  if (string.length == 0 || [string containsString:@":"]) {
    return nil;
  }
  if (NSColor *named = [NSColor colorNamed:string]) {
    return named;
  }
  if (![string hasSuffix:@"Color"]) {
    string = [string stringByAppendingString:@"Color"];
  }
  SEL selector = NSSelectorFromString(string);
  if (![NSColor respondsToSelector:selector]) {
    return nil;
  }
  id color = ((id (*)(Class, SEL))objc_msgSend)(NSColor.class, selector);
  return [color isKindOfClass:NSColor.class] ? color : nil;
}

} // namespace

int32_t Color::getColor() const
{
  NSColor *color = NSColorFromPlatformColor(platformColor_);
  if (color == nil) {
    return argb_;
  }
  // resolves a dynamic system color under NSAppearance.currentDrawingAppearance
  NSColor *srgb = [color colorUsingColorSpace:NSColorSpace.sRGBColorSpace];
  if (srgb == nil) {
    return 0;
  }
  auto channel = [](CGFloat value) { return (int32_t)std::round(value * 255) & 0xff; };
  return channel(srgb.alphaComponent) << 24 | channel(srgb.redComponent) << 16 | channel(srgb.greenComponent) << 8 |
      channel(srgb.blueComponent);
}

bool Color::platformColorEquals(const Color &other) const
{
  NSColor *color = NSColorFromPlatformColor(platformColor_);
  NSColor *otherColor = NSColorFromPlatformColor(other.platformColor_);
  return color == otherColor || [color isEqual:otherColor];
}

std::size_t Color::hash() const
{
  NSColor *color = NSColorFromPlatformColor(platformColor_);
  return color != nil ? (std::size_t)color.hash : std::hash<int32_t>{}(argb_);
}

Color Color::createSemanticColor(const std::vector<std::string> &semanticItems)
{
  for (const auto &name : semanticItems) {
    if (NSColor *color = NSColorFromSemanticName(name)) {
      return Color(PlatformColorFromNSColor(color));
    }
  }
  return HostPlatformColor::UndefinedColor;
}

} // namespace facebook::react
