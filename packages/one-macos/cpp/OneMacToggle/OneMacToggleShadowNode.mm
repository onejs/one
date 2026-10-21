#include "OneMacToggleShadowNode.h"

#import <AppKit/AppKit.h>

namespace facebook::react {

const char OneMacToggleComponentName[] = "OneMacToggle";

// switch track and the gap SwiftUI leaves between it and the label
static constexpr CGFloat kSwitchWidth = 38;
static constexpr CGFloat kLabelGap = 8;
static constexpr CGFloat kRowHeight = 22;

Size OneMacToggleShadowNode::measureContent(const LayoutContext &, const LayoutConstraints &layoutConstraints) const {
  const auto &label = getConcreteProps().label;
  CGFloat width = kSwitchWidth;
  if (!label.empty()) {
    NSString *text = [NSString stringWithUTF8String:label.c_str()];
    NSDictionary *attributes = @{NSFontAttributeName : [NSFont systemFontOfSize:[NSFont systemFontSize]]};
    width += kLabelGap + ceil([text sizeWithAttributes:attributes].width);
  }
  return layoutConstraints.clamp({static_cast<Float>(width), static_cast<Float>(kRowHeight)});
}

} // namespace facebook::react
