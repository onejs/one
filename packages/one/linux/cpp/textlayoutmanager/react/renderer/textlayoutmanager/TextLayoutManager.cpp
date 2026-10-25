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
  std::vector<OneLinuxTextAttachment> attachments;
  PangoLayout *layout = OneLinuxCreateLayout(
      attributedString, paragraphAttributes, std::isfinite(maximumWidth) ? std::min(maximumWidth, 1e7) : -1, true, &attachments);
  int width = 0;
  int height = 0;
  pango_layout_get_size(layout, &width, &height);

  TextMeasurement measurement;
  measurement.size = internal_roundTextMeasurementToPixelGrid(
      Size{.width = static_cast<Float>(width) / PANGO_SCALE, .height = static_cast<Float>(height) / PANGO_SCALE},
      layoutContext.pointScaleFactor);
  if (!attachments.empty()) {
    measurement.size = layoutConstraints.clamp(measurement.size);
    pango_layout_set_width(layout, static_cast<int>(std::ceil(measurement.size.width * PANGO_SCALE)));
    measurement.attachments.resize(attachments.size(), {.frame = {}, .isClipped = true});
    PangoLayoutIter *iter = pango_layout_get_iter(layout);
    do {
      auto *run = pango_layout_iter_get_run_readonly(iter);
      if (!run || (run->item->analysis.flags & PANGO_ANALYSIS_FLAG_IS_ELLIPSIS)) {
        continue;
      }
      auto first = std::lower_bound(attachments.begin(), attachments.end(), run->item->offset,
          [](const auto &attachment, int index) { return attachment.index < index; });
      for (auto attachment = first; attachment != attachments.end() && attachment->index < run->item->offset + run->item->length; ++attachment) {
        PangoRectangle position;
        pango_layout_index_to_pos(layout, attachment->index, &position);
        auto &result = measurement.attachments[attachment - attachments.begin()];
        result = {.frame = {.origin = {.x = static_cast<Float>(position.x + std::min(0, position.width)) / PANGO_SCALE,
                                      .y = static_cast<Float>(pango_layout_iter_get_baseline(iter)) / PANGO_SCALE - attachment->size.height},
                            .size = attachment->size},
                  .isClipped = false};
      }
    } while (pango_layout_iter_next_run(iter));
    pango_layout_iter_free(iter);
  }
  g_object_unref(layout);
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
