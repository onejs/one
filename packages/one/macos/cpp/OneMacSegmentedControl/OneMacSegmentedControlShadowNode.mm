#include "OneMacSegmentedControlShadowNode.h"
#import <AppKit/AppKit.h>
#include <react/renderer/core/LayoutConstraints.h>
namespace facebook::react {
const char OneMacSegmentedControlComponentName[] = "OneMacSegmentedControl";
static CGFloat textWidth(const std::string &text) {
  return ceil([[NSString stringWithUTF8String:text.c_str()] sizeWithAttributes:@{NSFontAttributeName: [NSFont systemFontOfSize:[NSFont systemFontSize]]}].width);
}
Size OneMacSegmentedControlShadowNode::measureContent(const LayoutContext &, const LayoutConstraints &constraints) const {
  const auto &props = getConcreteProps();
  CGFloat width = 0;
  for (const auto &label : props.labels) width += 24 + textWidth(label);
  return constraints.clamp({static_cast<Float>(width), 28});
}
}
