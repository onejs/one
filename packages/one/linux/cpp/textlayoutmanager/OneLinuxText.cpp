#include "OneLinuxText.h"

#include <pango/pangocairo.h>

#include <react/renderer/graphics/Color.h>

#include <cmath>
#include <string>

namespace facebook::react {

namespace {

// one context per thread: layout runs on the js thread and painting on the main
// thread, and pango font maps are not shared across threads
PangoContext *threadContext()
{
  thread_local PangoContext *context = [] {
    PangoContext *created = pango_font_map_create_context(pango_cairo_font_map_get_default());
    cairo_font_options_t *options = cairo_font_options_create();
    cairo_font_options_set_hint_metrics(options, CAIRO_HINT_METRICS_OFF);
    cairo_font_options_set_hint_style(options, CAIRO_HINT_STYLE_NONE);
    pango_cairo_context_set_font_options(created, options);
    cairo_font_options_destroy(options);
    return created;
  }();
  return context;
}

std::string transformed(const std::string &text, std::optional<TextTransform> transform)
{
  if (!transform) {
    return text;
  }
  switch (*transform) {
    case TextTransform::Uppercase: {
      gchar *converted = g_utf8_strup(text.c_str(), -1);
      std::string result(converted);
      g_free(converted);
      return result;
    }
    case TextTransform::Lowercase: {
      gchar *converted = g_utf8_strdown(text.c_str(), -1);
      std::string result(converted);
      g_free(converted);
      return result;
    }
    case TextTransform::Capitalize: {
      std::string result;
      bool wordStart = true;
      for (const gchar *p = text.c_str(); *p; p = g_utf8_next_char(p)) {
        gunichar character = g_utf8_get_char(p);
        if (g_unichar_isspace(character)) {
          wordStart = true;
        } else if (wordStart) {
          character = g_unichar_totitle(character);
          wordStart = false;
        }
        gchar buffer[8];
        result.append(buffer, g_unichar_to_utf8(character, buffer));
      }
      return result;
    }
    default:
      return text;
  }
}

PangoFontDescription *fontDescription(const TextAttributes &attributes)
{
  PangoFontDescription *description = pango_font_description_new();
  const std::string &family = attributes.fontFamily;
  bool isSystem = family.empty() || family == "System" || family == "system-ui" || family == "-apple-system";
  pango_font_description_set_family(description, isSystem ? "sans" : family.c_str());
  double size = std::isnan(attributes.fontSize) ? 14 : attributes.fontSize;
  pango_font_description_set_absolute_size(description, size * PANGO_SCALE);
  pango_font_description_set_weight(
      description, static_cast<PangoWeight>(attributes.fontWeight ? static_cast<int>(*attributes.fontWeight) : 400));
  if (attributes.fontStyle && *attributes.fontStyle != FontStyle::Normal) {
    pango_font_description_set_style(description, PANGO_STYLE_ITALIC);
  }
  return description;
}

guint16 channel(float value)
{
  return static_cast<guint16>(std::lround(std::clamp(value, 0.0f, 1.0f) * 65535));
}

void addColor(PangoAttrList *list, SharedColor color, double opacityScale, guint start, guint end, bool foreground)
{
  auto components = colorComponentsFromColor(color);
  PangoAttribute *rgb = foreground ? pango_attr_foreground_new(channel(components.red), channel(components.green), channel(components.blue))
                                   : pango_attr_background_new(channel(components.red), channel(components.green), channel(components.blue));
  PangoAttribute *alpha = foreground ? pango_attr_foreground_alpha_new(channel(components.alpha * opacityScale))
                                     : pango_attr_background_alpha_new(channel(components.alpha * opacityScale));
  rgb->start_index = alpha->start_index = start;
  rgb->end_index = alpha->end_index = end;
  pango_attr_list_insert(list, rgb);
  pango_attr_list_insert(list, alpha);
}

PangoAlignment alignmentValue(std::optional<TextAlignment> alignment)
{
  if (!alignment) {
    return PANGO_ALIGN_LEFT;
  }
  switch (*alignment) {
    case TextAlignment::Center: return PANGO_ALIGN_CENTER;
    case TextAlignment::Right: return PANGO_ALIGN_RIGHT;
    default: return PANGO_ALIGN_LEFT;
  }
}

PangoEllipsizeMode ellipsizeValue(EllipsizeMode mode)
{
  switch (mode) {
    case EllipsizeMode::Head: return PANGO_ELLIPSIZE_START;
    case EllipsizeMode::Middle: return PANGO_ELLIPSIZE_MIDDLE;
    case EllipsizeMode::Tail: return PANGO_ELLIPSIZE_END;
    case EllipsizeMode::Clip: return PANGO_ELLIPSIZE_NONE;
  }
  return PANGO_ELLIPSIZE_NONE;
}

} // namespace

PangoLayout *OneLinuxCreateLayout(
    const AttributedString &attributedString,
    const ParagraphAttributes &paragraphAttributes,
    double width,
    bool applyAlignment,
    std::vector<OneLinuxTextAttachment> *attachments)
{
  std::string text;
  PangoAttrList *list = pango_attr_list_new();
  std::optional<TextAlignment> alignment;

  for (const auto &fragment : attributedString.getFragments()) {
    const TextAttributes &attributes = fragment.textAttributes;
    if (!alignment) {
      alignment = attributes.alignment;
    }
    guint start = static_cast<guint>(text.size());
    text += fragment.isAttachment() ? "\xef\xbf\xbc" : transformed(fragment.string, attributes.textTransform);
    guint end = static_cast<guint>(text.size());
    if (start == end) {
      continue;
    }

    if (fragment.isAttachment()) {
      auto size = fragment.parentShadowView.layoutMetrics.frame.size;
      PangoRectangle ink{};
      PangoRectangle logical{0, -static_cast<int>(std::ceil(size.height * PANGO_SCALE)),
                             static_cast<int>(std::ceil(size.width * PANGO_SCALE)),
                             static_cast<int>(std::ceil(size.height * PANGO_SCALE))};
      PangoAttribute *shape = pango_attr_shape_new(&ink, &logical);
      shape->start_index = start;
      shape->end_index = end;
      pango_attr_list_insert(list, shape);
      if (attachments) {
        attachments->push_back({static_cast<int>(start), size});
      }
    }

    PangoFontDescription *description = fontDescription(attributes);
    PangoAttribute *font = pango_attr_font_desc_new(description);
    font->start_index = start;
    font->end_index = end;
    pango_attr_list_insert(list, font);
    pango_font_description_free(description);

    double opacity = std::isnan(attributes.opacity) ? 1 : attributes.opacity;
    if (attributes.foregroundColor) {
      addColor(list, attributes.foregroundColor, opacity, start, end, true);
    }
    if (attributes.backgroundColor) {
      addColor(list, attributes.backgroundColor, opacity, start, end, false);
    }
    if (!std::isnan(attributes.letterSpacing)) {
      PangoAttribute *spacing = pango_attr_letter_spacing_new(static_cast<int>(attributes.letterSpacing * PANGO_SCALE));
      spacing->start_index = start;
      spacing->end_index = end;
      pango_attr_list_insert(list, spacing);
    }
    if (!std::isnan(attributes.lineHeight) && attributes.lineHeight > 0) {
      PangoAttribute *lineHeight = pango_attr_line_height_new_absolute(static_cast<int>(attributes.lineHeight * PANGO_SCALE));
      lineHeight->start_index = start;
      lineHeight->end_index = end;
      pango_attr_list_insert(list, lineHeight);
    }
    if (attributes.textDecorationLineType) {
      auto line = *attributes.textDecorationLineType;
      if (line == TextDecorationLineType::Underline || line == TextDecorationLineType::UnderlineStrikethrough) {
        PangoAttribute *underline = pango_attr_underline_new(PANGO_UNDERLINE_SINGLE);
        underline->start_index = start;
        underline->end_index = end;
        pango_attr_list_insert(list, underline);
      }
      if (line == TextDecorationLineType::Strikethrough || line == TextDecorationLineType::UnderlineStrikethrough) {
        PangoAttribute *strike = pango_attr_strikethrough_new(TRUE);
        strike->start_index = start;
        strike->end_index = end;
        pango_attr_list_insert(list, strike);
      }
    }
  }

  PangoLayout *layout = pango_layout_new(threadContext());
  pango_layout_set_text(layout, text.c_str(), static_cast<int>(text.size()));
  pango_layout_set_attributes(layout, list);
  pango_attr_list_unref(list);
  pango_layout_set_wrap(layout, PANGO_WRAP_WORD_CHAR);
  if (width >= 0) {
    pango_layout_set_width(layout, static_cast<int>(std::ceil(width * PANGO_SCALE)));
    if (paragraphAttributes.maximumNumberOfLines > 0) {
      pango_layout_set_ellipsize(layout, ellipsizeValue(paragraphAttributes.ellipsizeMode));
      pango_layout_set_height(layout, -paragraphAttributes.maximumNumberOfLines);
    }
  }
  if (applyAlignment) {
    pango_layout_set_alignment(layout, alignmentValue(alignment));
    pango_layout_set_justify(layout, alignment && *alignment == TextAlignment::Justified);
  }
  return layout;
}

// a GtkText measures its line from the font its style gives it, so the field's
// font goes in its style rather than in the text attributes; the placeholder
// then shares it
std::string OneLinuxCreateFieldFontCss(const TextAttributes &attributes, const char *selector)
{
  PangoFontDescription *description = fontDescription(attributes);
  std::string css = std::string(selector) + " { font-family: \"" + std::string(pango_font_description_get_family(description)) + "\"; font-size: " +
      std::to_string(pango_font_description_get_size(description) / static_cast<double>(PANGO_SCALE)) + "px; font-weight: " +
      std::to_string(static_cast<int>(pango_font_description_get_weight(description))) + "; font-style: " +
      (pango_font_description_get_style(description) == PANGO_STYLE_ITALIC ? "italic" : "normal") + "; }";
  pango_font_description_free(description);
  return css;
}

std::string OneLinuxCreateColorCss(const SharedColor &color, double opacity, const char *selector, const char *property)
{
  if (!color) {
    return "";
  }
  auto components = colorComponentsFromColor(color);
  return std::string(selector) + " { " + property + ": rgba(" + std::to_string(static_cast<int>(std::lround(components.red * 255))) + ", " +
      std::to_string(static_cast<int>(std::lround(components.green * 255))) + ", " +
      std::to_string(static_cast<int>(std::lround(components.blue * 255))) + ", " + std::to_string(components.alpha * opacity) + "); }";
}

std::string OneLinuxCreateFieldColorCss(const TextAttributes &attributes, const char *selector)
{
  return OneLinuxCreateColorCss(attributes.foregroundColor, std::isnan(attributes.opacity) ? 1 : attributes.opacity, selector, "color");
}

} // namespace facebook::react
