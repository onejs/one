#include "OneMacImageShadowNode.h"
#include <react/renderer/core/LayoutConstraints.h>
namespace facebook::react {
const char OneMacImageComponentName[] = "OneMacImage";
Size OneMacImageShadowNode::measureContent(const LayoutContext &, const LayoutConstraints &constraints) const {
  const auto size = getConcreteProps().size;
  return constraints.clamp({size, size});
}
}
