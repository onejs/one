#import "PlatformColorParser.h"

#import <react/renderer/css/CSSColor.h>
#import <react/renderer/css/CSSValueParser.h>
#import <react/renderer/graphics/HostPlatformColor.h>

#import <string>
#import <unordered_map>

namespace facebook::react {

SharedColor parsePlatformColor(const ContextContainer & /*contextContainer*/, int32_t /*surfaceId*/, const RawValue &value)
{
  if (!value.hasType<std::unordered_map<std::string, RawValue>>()) {
    return clearColor();
  }
  auto items = (std::unordered_map<std::string, RawValue>)value;
  auto semantic = items.find("semantic");
  if (semantic == items.end() || !semantic->second.hasType<std::vector<std::string>>()) {
    return clearColor();
  }
  auto color = Color::createSemanticColor((std::vector<std::string>)semantic->second);
  if (color != HostPlatformColor::UndefinedColor) {
    return color;
  }
  // only a miss uses the fallback, so a name resolving to clear stays clear
  auto fallback = items.find("fallback");
  if (fallback != items.end() && fallback->second.hasType<std::string>()) {
    auto css = parseCSSProperty<CSSColor>((std::string)fallback->second);
    if (std::holds_alternative<CSSColor>(css)) {
      const auto &c = std::get<CSSColor>(css);
      return colorFromRGBA(c.r, c.g, c.b, c.a);
    }
  }
  return clearColor();
}

} // namespace facebook::react
