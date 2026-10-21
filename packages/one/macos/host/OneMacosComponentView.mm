#import "OneMacosComponentView.h"

#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/components/view/conversions.h>

#import "OneMacosText.h"

using namespace facebook::react;

@implementation OneMacosViewComponentView {
  Props::Shared _props;
  EventEmitter::Shared _eventEmitter;
  LayoutMetrics _layoutMetrics;
  BOOL _clipsToBounds;
  BOOL _ignoresPointerEvents;
}

@synthesize reactTag = _reactTag;

- (instancetype)initWithFrame:(NSRect)frame
{
  if (self = [super initWithFrame:frame]) {
    self.wantsLayer = YES;
    self.layer.masksToBounds = NO;
    self.layerContentsRedrawPolicy = NSViewLayerContentsRedrawOnSetNeedsDisplay;
  }
  return self;
}

// react lays out from the top left
- (BOOL)isFlipped
{
  return YES;
}

- (BOOL)isOpaque
{
  return NO;
}

- (Props::Shared)props
{
  return _props;
}

- (LayoutMetrics)layoutMetrics
{
  return _layoutMetrics;
}

- (EventEmitter::Shared)eventEmitter
{
  return _eventEmitter;
}

- (void)setNeedsRender
{
  self.needsDisplay = YES;
}

- (NSView *)hitTest:(NSPoint)point
{
  if (_ignoresPointerEvents) {
    for (NSView *subview in [self.subviews reverseObjectEnumerator]) {
      NSView *hit = [subview hitTest:[self convertPoint:point toView:subview]];
      if (hit) {
        return hit;
      }
    }
    return nil;
  }
  return [super hitTest:point];
}

#pragma mark - OneMacosComponentView

- (void)mountChildComponentView:(NSView<OneMacosComponentView> *)childView index:(NSInteger)index
{
  NSArray<NSView *> *subviews = self.subviews;
  if (index <= 0 && subviews.count > 0) {
    [self addSubview:childView positioned:NSWindowBelow relativeTo:subviews.firstObject];
  } else if (index > 0 && index < (NSInteger)subviews.count) {
    [self addSubview:childView positioned:NSWindowAbove relativeTo:subviews[index - 1]];
  } else {
    [self addSubview:childView];
  }
}

- (void)unmountChildComponentView:(NSView<OneMacosComponentView> *)childView index:(NSInteger)index
{
  [childView removeFromSuperview];
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  _props = props;
  const auto &viewProps = static_cast<const ViewProps &>(*props);
  _ignoresPointerEvents = viewProps.pointerEvents == PointerEventsMode::None;
  _clipsToBounds = viewProps.getClipsContentToBounds();
  self.alphaValue = (CGFloat)viewProps.opacity;
  self.layer.masksToBounds = _clipsToBounds;
  [self setNeedsRender];
}

- (void)updateEventEmitter:(const EventEmitter::Shared &)eventEmitter
{
  _eventEmitter = eventEmitter;
}

- (void)updateState:(const State::Shared &)state oldState:(const State::Shared &)oldState
{
}

- (void)updateLayoutMetrics:(const LayoutMetrics &)layoutMetrics oldLayoutMetrics:(const LayoutMetrics &)oldLayoutMetrics
{
  _layoutMetrics = layoutMetrics;
  self.hidden = layoutMetrics.displayType == DisplayType::None;
  self.frame = NSMakeRect(
      layoutMetrics.frame.origin.x,
      layoutMetrics.frame.origin.y,
      layoutMetrics.frame.size.width,
      layoutMetrics.frame.size.height);
  [self setNeedsRender];
}

- (void)finalizeUpdates:(OneMacosUpdateMask)updateMask
{
}

#pragma mark - Painting

- (void)drawRect:(NSRect)dirtyRect
{
  if (!_props) {
    return;
  }
  const auto &viewProps = static_cast<const ViewProps &>(*_props);
  const auto border = viewProps.resolveBorderMetrics(_layoutMetrics);
  CGRect bounds = self.bounds;
  CGFloat radius = MIN((CGFloat)border.borderRadii.topLeft.horizontal, MIN(bounds.size.width, bounds.size.height) / 2);
  CGFloat borderWidth = (CGFloat)border.borderWidths.top;

  NSBezierPath *outline = [NSBezierPath bezierPathWithRoundedRect:bounds xRadius:radius yRadius:radius];
  if (viewProps.backgroundColor) {
    [OneMacosColorFromSharedColor(viewProps.backgroundColor) setFill];
    [outline fill];
  }
  SharedColor borderColor = border.borderColors.top;
  if (borderWidth > 0 && borderColor) {
    CGRect inset = CGRectInset(bounds, borderWidth / 2, borderWidth / 2);
    NSBezierPath *stroke = [NSBezierPath bezierPathWithRoundedRect:inset
                                                           xRadius:MAX(radius - borderWidth / 2, 0)
                                                           yRadius:MAX(radius - borderWidth / 2, 0)];
    stroke.lineWidth = borderWidth;
    [OneMacosColorFromSharedColor(borderColor) setStroke];
    [stroke stroke];
  }
}

@end
