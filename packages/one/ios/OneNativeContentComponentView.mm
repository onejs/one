#include <cmath>
#import "OneNativeContentComponentView.h"
#import "One-Swift.h"
#import "OneNativeContentShadowNode.h"
#import <React/RCTSurfaceTouchHandler.h>

using namespace facebook::react;

// Swift.UIKitContent. the component view sits where React rendered it and shows nothing
// there; its children mount into a OneNativeContentView, which a cell or any UIKit view
// shows. the content view is this mount's for life, so a recycled component view takes
// a new one.
@implementation OneNativeContentComponentView {
  OneNativeContentShadowNode::ConcreteState::Shared _state;
  NSMutableArray<UIView *> *_children;
  OneNativeContentView *_content;
  NSInteger _contentId;
  NSInteger _sourceId;
  NSInteger _item;
  RCTSurfaceTouchHandler *_touchHandler;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeContentComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeContentProps>();
    _children = [NSMutableArray new];
    _touchHandler = [RCTSurfaceTouchHandler new];
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeContentProps>(props);
  if ((NSInteger)next.contentId != _contentId) {
    [self unregister];
    [self releaseContent];
    _contentId = (NSInteger)next.contentId;
    if (_contentId > 0) [self adoptContent:[OneNativeContentRegistry viewForId:_contentId]];
  }
  _content.fixedHeight = next.height > 0 ? next.height : 0;
  _content.estimatedHeight = next.estimatedHeight > 0 ? next.estimatedHeight : 44;
  if ((NSInteger)next.sourceId != _sourceId || (NSInteger)next.item != _item) {
    [self unregister];
    _sourceId = (NSInteger)next.sourceId;
    _item = (NSInteger)next.item;
    if (_content && _sourceId > 0) [OneNativeCellSources register:_content sourceId:_sourceId item:_item];
  }
  [super updateProps:props oldProps:oldProps];
}

- (void)adoptContent:(OneNativeContentView *)content {
  _content = content;
  for (UIView *child in _children) [content addSubview:child];
  __weak OneNativeContentComponentView *weakSelf = self;
  content.onWidth = ^(CGFloat width) { [weakSelf updateNativeWidth:width]; };
  content.onWindow = ^{ [weakSelf updateTouchHandler]; };
  [self reportMeasuredHeight];
  [self updateTouchHandler];
}

- (void)unregister {
  if (_content && _sourceId > 0) [OneNativeCellSources unregister:_content sourceId:_sourceId item:_item];
  _sourceId = 0;
  _item = 0;
}

// an unmounted content view stays wherever the app placed it, empty
- (void)releaseContent {
  if (!_content) return;
  for (UIView *child in _children) [child removeFromSuperview];
  if (_touchHandler.view) [_touchHandler detachFromView:_touchHandler.view];
  _content.onWidth = nil;
  _content.onWindow = nil;
  _content = nil;
  [OneNativeContentRegistry unmount:_contentId];
  _contentId = 0;
}

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  [_children insertObject:child atIndex:MIN((NSUInteger)index, _children.count)];
  [_content insertSubview:child atIndex:index];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  [_children removeObject:child];
  [child removeFromSuperview];
}

- (void)updateState:(State::Shared const &)state oldState:(State::Shared const &)oldState {
  _state = std::static_pointer_cast<const OneNativeContentShadowNode::ConcreteState>(state);
  [self reportMeasuredHeight];
}

// the width UIKit gave the content view. the height stays undefined, so yoga sizes the
// node to its children
- (void)updateNativeWidth:(CGFloat)width {
  if (!_state || !std::isfinite(width)) return;
  const auto &old = _state->getData();
  if (old.measured && old.size.width == (Float)width) return;
  OneNativeSlotState state = old;
  state.size = facebook::react::Size{(Float)width, (Float)NAN};
  state.measured = true;
  _state->updateState(std::move(state));
}

// the shadow node measures the children's layout, since flattening can remove the
// authored root from the mounted views. an empty layout reports zero, which unsets it
- (void)reportMeasuredHeight {
  if (!_content || !_state) return;
  const auto height = _state->getData().content.height;
  if (std::isfinite(height) && height >= 0) [_content setMeasuredHeight:height];
}

// inside the React Native surface its touch handler sees the content; anywhere else, such
// as a pushed or presented controller, the content needs its own
- (void)updateTouchHandler {
  BOOL inSurface = NO;
  for (UIView *view = _content.superview; view && !inSurface; view = view.superview)
    for (UIGestureRecognizer *recognizer in view.gestureRecognizers)
      if ([recognizer isKindOfClass:RCTSurfaceTouchHandler.class]) {
        inSurface = YES;
        break;
      }
  UIView *target = _content.window && !inSurface ? _content : nil;
  if (_touchHandler.view == target) return;
  if (_touchHandler.view) [_touchHandler detachFromView:_touchHandler.view];
  if (target) [_touchHandler attachToView:target];
}

- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event {
  return nil;
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  [self unregister];
  [self releaseContent];
  [_children removeAllObjects];
  _state.reset();
}

@end
