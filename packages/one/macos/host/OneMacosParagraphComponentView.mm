#import "OneMacosParagraphComponentView.h"

#include <react/renderer/components/text/ParagraphProps.h>
#include <react/renderer/components/text/ParagraphShadowNode.h>
#include <react/renderer/components/text/ParagraphState.h>

#import "OneMacosText.h"

using namespace facebook::react;

@implementation OneMacosParagraphComponentView {
  ParagraphShadowNode::ConcreteState::Shared _state;
}

- (void)updateState:(const State::Shared &)state oldState:(const State::Shared &)oldState
{
  _state = std::static_pointer_cast<const ParagraphShadowNode::ConcreteState>(state);
  [self setNeedsRender];
}

- (void)drawRect:(NSRect)dirtyRect
{
  [super drawRect:dirtyRect];
  if (!_state) {
    return;
  }
  const auto &data = _state->getData();
  const auto &frame = self.layoutMetrics.getContentFrame();
  // the text container is laid out inside the content frame, offset by padding
  CGRect textFrame = CGRectMake(
      frame.origin.x, frame.origin.y, frame.size.width, frame.size.height);
  OneMacosDrawText(data.attributedString, data.paragraphAttributes, textFrame);
}

@end
