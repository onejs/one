#pragma once

#import <AppKit/AppKit.h>

#include <react/renderer/attributedstring/AttributedString.h>
#include <react/renderer/attributedstring/ParagraphAttributes.h>

// Builds the NSTextStorage that both measurement and painting use. The text
// container has zero line fragment padding and the paragraph's line and
// ellipsis settings, so a measured size reproduces when drawn.
NSTextStorage *OneMacosTextStorage(
    const facebook::react::AttributedString &attributedString,
    const facebook::react::ParagraphAttributes &paragraphAttributes,
    CGSize size);

NSColor *OneMacosColorFromSharedColor(facebook::react::SharedColor color);

// Draws at `frame` in the current (flipped) graphics context.
void OneMacosDrawText(
    const facebook::react::AttributedString &attributedString,
    const facebook::react::ParagraphAttributes &paragraphAttributes,
    CGRect frame);
