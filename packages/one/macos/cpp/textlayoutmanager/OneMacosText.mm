#import "OneMacosText.h"

#include <react/renderer/graphics/Color.h>
#include <react/renderer/textlayoutmanager/TextMeasurementRounding.h>

using namespace facebook::react;

NSColor *OneMacosColorFromSharedColor(SharedColor color)
{
  if (!color) {
    return nil;
  }
  auto c = colorComponentsFromColor(color);
  return [NSColor colorWithSRGBRed:c.red green:c.green blue:c.blue alpha:c.alpha];
}

static NSFontWeight FontWeightValue(int weight)
{
  switch (weight) {
    case 100: return NSFontWeightUltraLight;
    case 200: return NSFontWeightThin;
    case 300: return NSFontWeightLight;
    case 500: return NSFontWeightMedium;
    case 600: return NSFontWeightSemibold;
    case 700: return NSFontWeightBold;
    case 800: return NSFontWeightHeavy;
    case 900: return NSFontWeightBlack;
    default: return NSFontWeightRegular;
  }
}

static NSFont *FontForAttributes(const TextAttributes &attributes)
{
  CGFloat size = std::isnan(attributes.fontSize) ? 14 : attributes.fontSize;
  NSFontWeight weight = FontWeightValue(attributes.fontWeight ? (int)*attributes.fontWeight : 400);
  bool italic = attributes.fontStyle && *attributes.fontStyle != FontStyle::Normal;

  NSFont *font = nil;
  const std::string &family = attributes.fontFamily;
  bool isSystem = family.empty() || family == "System" || family == "system-ui" || family == "-apple-system";
  if (!isSystem) {
    NSString *name = [NSString stringWithUTF8String:family.c_str()];
    font = [NSFont fontWithName:name size:size];
    if (!font) {
      NSFontDescriptor *descriptor = [NSFontDescriptor fontDescriptorWithFontAttributes:@{
        NSFontFamilyAttribute : name,
        NSFontTraitsAttribute : @{NSFontWeightTrait : @(weight)}
      }];
      font = [NSFont fontWithDescriptor:descriptor size:size];
    }
  }
  if (!font) {
    font = [NSFont systemFontOfSize:size weight:weight];
  }
  if (italic) {
    NSFontDescriptor *descriptor = [font.fontDescriptor fontDescriptorWithSymbolicTraits:font.fontDescriptor.symbolicTraits | NSFontDescriptorTraitItalic];
    if (NSFont *italicFont = [NSFont fontWithDescriptor:descriptor size:size]) {
      font = italicFont;
    }
  }
  return font;
}

static NSTextAlignment AlignmentValue(std::optional<TextAlignment> alignment)
{
  if (!alignment) {
    return NSTextAlignmentNatural;
  }
  switch (*alignment) {
    case TextAlignment::Left: return NSTextAlignmentLeft;
    case TextAlignment::Center: return NSTextAlignmentCenter;
    case TextAlignment::Right: return NSTextAlignmentRight;
    case TextAlignment::Justified: return NSTextAlignmentJustified;
    default: return NSTextAlignmentNatural;
  }
}

static NSLineBreakMode LineBreakModeValue(EllipsizeMode mode)
{
  switch (mode) {
    case EllipsizeMode::Clip: return NSLineBreakByClipping;
    case EllipsizeMode::Head: return NSLineBreakByTruncatingHead;
    case EllipsizeMode::Middle: return NSLineBreakByTruncatingMiddle;
    case EllipsizeMode::Tail: return NSLineBreakByTruncatingTail;
  }
}

static NSAttributedString *AttributedStringValue(const AttributedString &attributedString)
{
  NSMutableAttributedString *result = [NSMutableAttributedString new];
  for (const auto &fragment : attributedString.getFragments()) {
    if (fragment.isAttachment()) {
      continue;
    }
    const TextAttributes &attributes = fragment.textAttributes;
    NSMutableDictionary<NSAttributedStringKey, id> *dictionary = [NSMutableDictionary new];
    dictionary[NSFontAttributeName] = FontForAttributes(attributes);

    NSColor *foreground = OneMacosColorFromSharedColor(attributes.foregroundColor);
    dictionary[NSForegroundColorAttributeName] = foreground ?: [NSColor textColor];
    if (attributes.opacity == attributes.opacity && foreground) {
      dictionary[NSForegroundColorAttributeName] = [foreground colorWithAlphaComponent:foreground.alphaComponent * attributes.opacity];
    }
    if (NSColor *background = OneMacosColorFromSharedColor(attributes.backgroundColor)) {
      dictionary[NSBackgroundColorAttributeName] = background;
    }
    if (!std::isnan(attributes.letterSpacing)) {
      dictionary[NSKernAttributeName] = @(attributes.letterSpacing);
    }

    NSMutableParagraphStyle *style = [NSMutableParagraphStyle new];
    style.alignment = AlignmentValue(attributes.alignment);
    if (!std::isnan(attributes.lineHeight) && attributes.lineHeight > 0) {
      style.minimumLineHeight = attributes.lineHeight;
      style.maximumLineHeight = attributes.lineHeight;
    }
    dictionary[NSParagraphStyleAttributeName] = style;

    if (attributes.textDecorationLineType) {
      auto line = *attributes.textDecorationLineType;
      NSColor *decorationColor = OneMacosColorFromSharedColor(attributes.textDecorationColor) ?: foreground;
      if (line == TextDecorationLineType::Underline || line == TextDecorationLineType::UnderlineStrikethrough) {
        dictionary[NSUnderlineStyleAttributeName] = @(NSUnderlineStyleSingle);
        if (decorationColor) dictionary[NSUnderlineColorAttributeName] = decorationColor;
      }
      if (line == TextDecorationLineType::Strikethrough || line == TextDecorationLineType::UnderlineStrikethrough) {
        dictionary[NSStrikethroughStyleAttributeName] = @(NSUnderlineStyleSingle);
        if (decorationColor) dictionary[NSStrikethroughColorAttributeName] = decorationColor;
      }
    }

    NSString *string = [NSString stringWithUTF8String:fragment.string.c_str()] ?: @"";
    if (attributes.textTransform) {
      switch (*attributes.textTransform) {
        case TextTransform::Uppercase: string = string.uppercaseString; break;
        case TextTransform::Lowercase: string = string.lowercaseString; break;
        case TextTransform::Capitalize: string = string.capitalizedString; break;
        default: break;
      }
    }
    [result appendAttributedString:[[NSAttributedString alloc] initWithString:string attributes:dictionary]];
  }
  return result;
}

NSTextStorage *OneMacosTextStorage(const AttributedString &attributedString, const ParagraphAttributes &paragraphAttributes, CGSize size)
{
  NSTextStorage *textStorage = [[NSTextStorage alloc] initWithAttributedString:AttributedStringValue(attributedString)];
  NSLayoutManager *layoutManager = [NSLayoutManager new];
  layoutManager.usesFontLeading = NO;
  NSTextContainer *container = [[NSTextContainer alloc] initWithSize:size];
  container.lineFragmentPadding = 0;
  container.maximumNumberOfLines = paragraphAttributes.maximumNumberOfLines;
  container.lineBreakMode = LineBreakModeValue(paragraphAttributes.ellipsizeMode);
  [layoutManager addTextContainer:container];
  [textStorage addLayoutManager:layoutManager];
  return textStorage;
}

void OneMacosDrawText(const AttributedString &attributedString, const ParagraphAttributes &paragraphAttributes, CGRect frame)
{
  NSTextStorage *textStorage = OneMacosTextStorage(attributedString, paragraphAttributes, frame.size);
  NSLayoutManager *layoutManager = textStorage.layoutManagers.firstObject;
  NSTextContainer *container = layoutManager.textContainers.firstObject;
  NSRange glyphRange = [layoutManager glyphRangeForTextContainer:container];
  [layoutManager drawBackgroundForGlyphRange:glyphRange atPoint:frame.origin];
  [layoutManager drawGlyphsForGlyphRange:glyphRange atPoint:frame.origin];
}
