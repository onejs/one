#include "OneMacPopUpButtonShadowNode.h"
#import <AppKit/AppKit.h>
#include <react/renderer/core/LayoutConstraints.h>
namespace facebook::react {
const char OneMacPopUpButtonComponentName[] = "OneMacPopUpButton";
static CGFloat textWidth(const std::string &text) {
  return ceil([[NSString stringWithUTF8String:text.c_str()] sizeWithAttributes:@{NSFontAttributeName: [NSFont systemFontOfSize:[NSFont systemFontSize]]}].width);
}
Size OneMacPopUpButtonShadowNode::measureContent(const LayoutContext &, const LayoutConstraints &constraints) const {
  const auto &props = getConcreteProps();
  // the widest item plus the bezel and the up and down arrows, as AppKit sizes it
  CGFloat width = 0;
  for (const auto &label : props.labels) width = std::max(width, textWidth(label));
  return constraints.clamp({static_cast<Float>(width + 40), 24});
}
}
