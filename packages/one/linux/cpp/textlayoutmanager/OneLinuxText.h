#pragma once

#include <pango/pango.h>

#include <react/renderer/attributedstring/AttributedString.h>
#include <react/renderer/attributedstring/ParagraphAttributes.h>
#include <react/renderer/attributedstring/TextAttributes.h>

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

// The font and color of an editable field's text as one attribute list for
// GtkText, covering the whole text. The caller owns the returned list.
PangoAttrList *OneLinuxCreateFieldAttributes(const TextAttributes &attributes);

} // namespace facebook::react
