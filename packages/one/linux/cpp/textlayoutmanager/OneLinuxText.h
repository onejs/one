#pragma once

#include <pango/pango.h>

#include <react/renderer/attributedstring/AttributedString.h>
#include <react/renderer/attributedstring/ParagraphAttributes.h>

namespace facebook::react {

// Builds the PangoLayout that both measurement and painting use. Sizes are in
// logical pixels with metric hinting off, so a measured size reproduces when
// the layout is drawn at any scale. `width` below zero lays the text out
// unwrapped. The caller owns the returned layout.
PangoLayout *OneLinuxCreateLayout(
    const AttributedString &attributedString,
    const ParagraphAttributes &paragraphAttributes,
    double width,
    bool applyAlignment);

} // namespace facebook::react
