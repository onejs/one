#import "OneNativeContextMenuPreviewComponentView.h"
#import <React/RCTView.h>
#import "OneNativeContextMenuPreviewShadowNode.h"
#include <cmath>

using namespace facebook::react;

@implementation OneNativeContextMenuPreviewComponentView {
  OneNativeContextMenuPreviewShadowNode::ConcreteState::Shared _slotState;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<OneNativeContextMenuPreviewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeContextMenuPreviewProps>();
    // the preview lays out here but never paints inline: UIKit shows the content
    // in its own preview view controller while the menu is presented. hiding the
    // marker keeps the laid-out subtree out of pixels and accessibility until the
    // menu reparents it. a preview takes no touches of its own, so unlike a
    // presented sheet or popover body it carries no surface touch handler.
    self.hidden = YES;
  }
  return self;
}

- (void)updateState:(State::Shared const &)state oldState:(State::Shared const &)oldState
{
  _slotState = std::static_pointer_cast<const OneNativeContextMenuPreviewShadowNode::ConcreteState>(state);
}

- (void)updateNativeFrame:(CGRect)frame
{
  if (!_slotState || !std::isfinite(frame.size.width) || !std::isfinite(frame.size.height)) return;
  const auto &old = _slotState->getData();
  const facebook::react::Size size{(Float)frame.size.width, (Float)frame.size.height};
  if (old.measured && old.size == size) return;
  OneNativeSlotState state;
  state.size = size;
  state.measured = true;
  _slotState->updateState(std::move(state));
}

- (void)updateLayoutMetrics:(LayoutMetrics const &)layoutMetrics oldLayoutMetrics:(LayoutMetrics const &)oldLayoutMetrics
{
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  self.hidden = YES;
  self.frame = (CGRect){CGPointZero, self.bounds.size};
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  self.hidden = YES;
  _slotState.reset();
}

@end
