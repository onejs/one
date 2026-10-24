#include "TextLayoutManager.h"

#include <react/renderer/attributedstring/PlaceholderAttributedString.h>
#include <react/renderer/telemetry/TransactionTelemetry.h>
#include <react/renderer/textlayoutmanager/TextMeasurementRounding.h>

#include <algorithm>

#include "OneLinuxText.h"

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
  double maximumWidth = layoutConstraints.maximumSize.width;
  PangoLayout *layout = OneLinuxCreateLayout(
      attributedString, paragraphAttributes, std::isfinite(maximumWidth) ? std::min(maximumWidth, 1e7) : -1, false);
  int width = 0;
  int height = 0;
  pango_layout_get_size(layout, &width, &height);
  g_object_unref(layout);

  TextMeasurement measurement;
  measurement.size = internal_roundTextMeasurementToPixelGrid(
      Size{.width = static_cast<Float>(width) / PANGO_SCALE, .height = static_cast<Float>(height) / PANGO_SCALE},
      layoutContext.pointScaleFactor);
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
