#pragma once

#include <pango/pango.h>
#include <vector>

#include <react/renderer/attributedstring/AttributedString.h>
#include <react/renderer/attributedstring/ParagraphAttributes.h>
#include <react/renderer/attributedstring/TextAttributes.h>

namespace facebook::react {

struct OneLinuxTextAttachment {
  int index;
  Size size;
};

// builds the PangoLayout that both measurement and painting use. sizes are in
// logical pixels with metric hinting off, so a measured size reproduces when
// the layout is drawn at any scale. `width` below zero lays the text out
// unwrapped. The caller owns the returned layout.
PangoLayout *OneLinuxCreateLayout(
    const AttributedString &attributedString,
    const ParagraphAttributes &paragraphAttributes,
    double width,
    bool applyAlignment,
    std::vector<OneLinuxTextAttachment> *attachments = nullptr);

// the editable field's font as CSS for the node named by selector
std::string OneLinuxCreateFieldFontCss(const TextAttributes &attributes, const char *selector = "text");
// one color as a CSS rule for `property`; empty when the color is unset
std::string OneLinuxCreateColorCss(const SharedColor &color, double opacity, const char *selector, const char *property);
std::string OneLinuxCreateFieldColorCss(const TextAttributes &attributes, const char *selector);

} // namespace facebook::react
