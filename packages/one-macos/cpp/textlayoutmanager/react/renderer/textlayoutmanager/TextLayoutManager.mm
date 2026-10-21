#import "TextLayoutManager.h"

#import <AppKit/AppKit.h>

#import <react/renderer/attributedstring/PlaceholderAttributedString.h>
#import <react/renderer/telemetry/TransactionTelemetry.h>
#import <react/renderer/textlayoutmanager/TextMeasurementRounding.h>

#import "OneMacosText.h"

namespace facebook::react {

TextLayoutManager::TextLayoutManager(const std::shared_ptr<const ContextContainer> &contextContainer)
    : contextContainer_(contextContainer), textMeasureCache_(kSimpleThreadSafeCacheSizeCap)
{
}

static TextMeasurement measureString(
    const AttributedString &attributedString,
    const ParagraphAttributes &paragraphAttributes,
    const TextLayoutContext &layoutContext,
    const LayoutConstraints &layoutConstraints)
{
  if (attributedString.isEmpty()) {
    return {};
  }
  CGFloat width = std::min<CGFloat>(layoutConstraints.maximumSize.width, 1e7);
  NSTextStorage *textStorage = OneMacosTextStorage(attributedString, paragraphAttributes, CGSizeMake(width, 1e7));
  NSLayoutManager *layoutManager = textStorage.layoutManagers.firstObject;
  NSTextContainer *container = layoutManager.textContainers.firstObject;
  [layoutManager ensureLayoutForTextContainer:container];
  CGRect used = [layoutManager usedRectForTextContainer:container];

  TextMeasurement measurement;
  measurement.size = internal_roundTextMeasurementToPixelGrid(
      Size{.width = static_cast<Float>(used.size.width), .height = static_cast<Float>(used.size.height)}, layoutContext.pointScaleFactor);
  return measurement;
}

TextMeasurement TextLayoutManager::measure(
    const AttributedStringBox &attributedStringBox,
    const ParagraphAttributes &paragraphAttributes,
    const TextLayoutContext &layoutContext,
    const LayoutConstraints &layoutConstraints) const
{
  auto measurement = TextMeasurement{};
  if (attributedStringBox.getMode() == AttributedStringBox::Mode::Value) {
    auto original = attributedStringBox.getValue();
    auto attributedString = ensurePlaceholderIfEmpty_DO_NOT_USE(original);
    measurement = textMeasureCache_.get(
        {.attributedString = attributedString,
         .paragraphAttributes = paragraphAttributes,
         .layoutConstraints = layoutConstraints,
         .pointScaleFactor = layoutContext.pointScaleFactor},
        [&]() {
          auto telemetry = TransactionTelemetry::threadLocalTelemetry();
          if (telemetry) {
            telemetry->willMeasureText();
          }
          auto result = measureString(attributedString, paragraphAttributes, layoutContext, layoutConstraints);
          if (original.isEmpty()) {
            result.size.width = 0;
          }
          if (telemetry) {
            telemetry->didMeasureText();
          }
          return result;
        });
  }
  measurement.size = layoutConstraints.clamp(measurement.size);
  return measurement;
}

} // namespace facebook::react
