#pragma once

#include <react/renderer/attributedstring/AttributedStringBox.h>
#include <react/renderer/attributedstring/ParagraphAttributes.h>
#include <react/renderer/core/LayoutConstraints.h>
#include <react/renderer/textlayoutmanager/TextLayoutContext.h>
#include <react/renderer/textlayoutmanager/TextMeasureCache.h>
#include <react/utils/ContextContainer.h>
#include <memory>

namespace facebook::react {

// Linux text measurement on Pango. The paragraph widget paints the layout
// OneLinuxCreateLayout builds, so measured and drawn text agree.
class TextLayoutManager {
 public:
  explicit TextLayoutManager(const std::shared_ptr<const ContextContainer> &contextContainer);

  TextLayoutManager(const TextLayoutManager &) = delete;
  TextLayoutManager &operator=(const TextLayoutManager &) = delete;
  TextLayoutManager(TextLayoutManager &&) = delete;
  TextLayoutManager &operator=(TextLayoutManager &&) = delete;

  TextMeasurement measure(
      const AttributedStringBox &attributedStringBox,
      const ParagraphAttributes &paragraphAttributes,
      const TextLayoutContext &layoutContext,
      const LayoutConstraints &layoutConstraints) const;

 protected:
  std::shared_ptr<const ContextContainer> contextContainer_;
  TextMeasureCache textMeasureCache_;
};

} // namespace facebook::react
