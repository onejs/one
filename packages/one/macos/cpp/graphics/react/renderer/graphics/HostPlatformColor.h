#pragma once

#include <react/renderer/graphics/ColorComponents.h>
#include <cmath>
#include <cstdint>
#include <functional>
#include <memory>
#include <string>
#include <vector>

namespace facebook::react {

// macOS host color. An ordinary color is the same packed ARGB integer the cxx
// backend uses. A PlatformColor keeps its AppKit NSColor, so drawing resolves
// it against the view's appearance, accent and contrast instead of a snapshot.
class Color {
 public:
  Color() = default;
  Color(int32_t color) : argb_(color) {}

  // packed ARGB; a platform color resolves under the current drawing appearance
  int32_t getColor() const;

  // the retained NSColor of a platform color, null for an ordinary color
  const std::shared_ptr<void> &getPlatformColor() const
  {
    return platformColor_;
  }

  // the undefined color when no name resolves
  static Color createSemanticColor(const std::vector<std::string> &semanticItems);

  bool operator==(const Color &other) const
  {
    if (!platformColor_ && !other.platformColor_) {
      return argb_ == other.argb_;
    }
    return platformColorEquals(other);
  }

  bool operator!=(const Color &other) const
  {
    return !(*this == other);
  }

  operator int32_t() const
  {
    return getColor();
  }

  std::size_t hash() const;

 private:
  explicit Color(std::shared_ptr<void> platformColor) : platformColor_(std::move(platformColor)) {}
  bool platformColorEquals(const Color &other) const;

  int32_t argb_{0};
  std::shared_ptr<void> platformColor_;
};

namespace HostPlatformColor {
[[clang::no_destroy]] inline const facebook::react::Color UndefinedColor = Color();
}

inline Color hostPlatformColorFromRGBA(uint8_t r, uint8_t g, uint8_t b, uint8_t a)
{
  return Color((a & 0xff) << 24 | (r & 0xff) << 16 | (g & 0xff) << 8 | (b & 0xff));
}

inline Color hostPlatformColorFromComponents(ColorComponents components)
{
  float ratio = 255;
  return hostPlatformColorFromRGBA(
      static_cast<uint8_t>(std::round(components.red * ratio)),
      static_cast<uint8_t>(std::round(components.green * ratio)),
      static_cast<uint8_t>(std::round(components.blue * ratio)),
      static_cast<uint8_t>(std::round(components.alpha * ratio)));
}

inline float alphaFromHostPlatformColor(Color color)
{
  return static_cast<float>((color.getColor() >> 24) & 0xff);
}

inline float redFromHostPlatformColor(Color color)
{
  return static_cast<float>((color.getColor() >> 16) & 0xff);
}

inline float greenFromHostPlatformColor(Color color)
{
  return static_cast<float>((color.getColor() >> 8) & 0xff);
}

inline float blueFromHostPlatformColor(Color color)
{
  return static_cast<float>(color.getColor() & 0xff);
}

inline bool hostPlatformColorIsColorMeaningful(Color color) noexcept
{
  return alphaFromHostPlatformColor(color) > 0;
}

inline ColorComponents colorComponentsFromHostPlatformColor(Color color)
{
  float ratio = 255;
  int32_t argb = color.getColor();
  return ColorComponents{
      .red = static_cast<float>((argb >> 16) & 0xff) / ratio,
      .green = static_cast<float>((argb >> 8) & 0xff) / ratio,
      .blue = static_cast<float>(argb & 0xff) / ratio,
      .alpha = static_cast<float>((argb >> 24) & 0xff) / ratio};
}

} // namespace facebook::react

template <>
struct std::hash<facebook::react::Color> {
  size_t operator()(const facebook::react::Color &color) const
  {
    return color.hash();
  }
};
