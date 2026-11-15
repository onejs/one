#include "OneMacButtonShadowNode.h"
#import <AppKit/AppKit.h>
#include <react/renderer/core/LayoutConstraints.h>
namespace facebook::react {
const char OneMacButtonComponentName[] = "OneMacButton";
static CGFloat textWidth(const std::string &text) {
  return ceil([[NSString stringWithUTF8String:text.c_str()] sizeWithAttributes:@{NSFontAttributeName: [NSFont systemFontOfSize:[NSFont systemFontSize]]}].width);
}
Size OneMacButtonShadowNode::measureContent(const LayoutContext &, const LayoutConstraints &constraints) const {
  const auto &props = getConcreteProps();
  CGFloat width = 28 + textWidth(props.title);
  if (!props.systemImage.empty()) width += props.title.empty() ? 16 : 22;
  return constraints.clamp({static_cast<Float>(width), 28});
}
}
