#import "OneNativePortalRegistry.h"
#include "OneNativePortalShadowNode.h"
using namespace facebook::react;
@implementation OneNativePortalViewComponentView {
  NSMutableArray<UIView *> *_children;
  UIView *_inlineView;
  UIView *_target;
  OnePortalShadowNode::ConcreteState::Shared _portalState;
  BOOL _registered;
}
+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OnePortalComponentDescriptor>();
}
- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativePortalViewProps>();
    _children = [NSMutableArray new];
    _inlineView = [UIView new];
    self.contentView = _inlineView;
    _target = _inlineView;
  }
  return self;
}
- (NSArray<UIView *> *)portalChildren { return _children; }
- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativePortalViewProps>(props);
  self.hostName = next.hostName.empty() ? nil : @(next.hostName.c_str());
  self.portalName = next.name.empty() ? nil : @(next.name.c_str());
  [super updateProps:props oldProps:oldProps];
  if (!_registered) {
    _registered = YES;
    [[OneNativePortalRegistry shared] addPortal:self];
  } else [[OneNativePortalRegistry shared] refresh];
}
- (void)refreshTarget {
  OneNativePortalRegistry *registry = [OneNativePortalRegistry shared];
  UIView *target = [registry isReplaced:self] ? nil :
      ([registry hostForPortal:self] ?: _inlineView);
  _target = target;
  for (UIView *child in _children) {
    if (child.superview != _target) [child removeFromSuperview];
    if (_target) [_target addSubview:child];
  }
  [self publishLayout];
}
- (void)publishLayout {
  if (!_portalState) return;
  OnePortalState next;
  if ([_target isKindOfClass:OneNativePortalHostViewComponentView.class] && self.window && _target.window) {
    next.active = true;
    next.hostWidth = _target.bounds.size.width;
    next.hostHeight = _target.bounds.size.height;
    CGPoint offset = [_target convertPoint:CGPointZero toView:self];
    next.offsetX = offset.x; next.offsetY = offset.y;
  }
  _portalState->updateState([next](const OnePortalState &old) -> std::shared_ptr<const OnePortalState> {
    if (old.active == next.active && old.hostWidth == next.hostWidth &&
        old.hostHeight == next.hostHeight && old.offsetX == next.offsetX && old.offsetY == next.offsetY)
      return nullptr;
    return std::make_shared<const OnePortalState>(next);
  });
}
- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  [_children insertObject:child atIndex:MIN(index, _children.count)];
  [[OneNativePortalRegistry shared] refresh];
}
- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  [_children removeObject:child]; [child removeFromSuperview];
}
- (void)updateState:(State::Shared const &)state oldState:(State::Shared const &)oldState {
  _portalState = std::static_pointer_cast<const OnePortalShadowNode::ConcreteState>(state);
  [self publishLayout];
}
- (void)layoutSubviews { [super layoutSubviews]; [self publishLayout]; }
- (void)didMoveToWindow { [super didMoveToWindow]; [self publishLayout]; }
- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event {
  if (_target != _inlineView || !self.userInteractionEnabled || self.hidden) return nil;
  for (UIView *child in [_children reverseObjectEnumerator]) {
    UIView *hit = [child hitTest:[child convertPoint:point fromView:self] withEvent:event];
    if (hit) return hit;
  }
  return nil;
}
- (void)prepareForRecycle {
  if (_registered) [[OneNativePortalRegistry shared] removePortal:self];
  _registered = NO;
  for (UIView *child in _children) [child removeFromSuperview];
  [_children removeAllObjects];
  self.hostName = nil; self.portalName = nil; _target = _inlineView; _portalState.reset();
  [super prepareForRecycle];
}
@end
