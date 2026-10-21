#pragma once

#include <react/renderer/attributedstring/AttributedStringBox.h>
#include <react/renderer/attributedstring/ParagraphAttributes.h>
#include <react/renderer/core/LayoutConstraints.h>
#include <react/renderer/textlayoutmanager/TextLayoutContext.h>
#include <react/renderer/textlayoutmanager/TextMeasureCache.h>
#include <react/utils/ContextContainer.h>
#include <memory>

namespace facebook::react {

// macOS text measurement on TextKit. The paragraph component view draws with
// the same NSTextStorage construction (OneMacosText.h), so layout and paint agree.
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
