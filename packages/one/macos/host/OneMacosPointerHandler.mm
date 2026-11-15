#import "OneMacosPointerHandler.h"

#include <react/renderer/components/view/BaseViewEventEmitter.h>
#include <react/renderer/components/view/ViewProps.h>
#include <react/timing/primitives.h>

#import "OneMacosComponentView.h"

using namespace facebook::react;

namespace {

BOOL IsViewComponent(NSView *view)
{
  return [view isKindOfClass:OneMacosViewComponentView.class];
}

// the nearest mounted react view at or above `view` that can receive events
OneMacosViewComponentView *ReactViewFrom(NSView *view, NSView *root)
{
  while (view && view != root) {
    if (IsViewComponent(view) && ((OneMacosViewComponentView *)view).eventEmitter) {
      return (OneMacosViewComponentView *)view;
    }
    view = view.superview;
  }
  return nil;
}

const ViewEvents &EventsOf(OneMacosViewComponentView *view)
{
  return static_cast<const ViewProps &>(*view.props).events;
}

std::shared_ptr<const BaseViewEventEmitter> EmitterOf(OneMacosViewComponentView *view)
{
  return std::static_pointer_cast<const BaseViewEventEmitter>(view.eventEmitter);
}

NSCursor *CursorFor(Cursor cursor)
{
  switch (cursor) {
    case Cursor::Pointer:
    case Cursor::Url:
      return NSCursor.pointingHandCursor;
    case Cursor::Text:
      return NSCursor.IBeamCursor;
    case Cursor::Crosshair:
    case Cursor::Cell:
      return NSCursor.crosshairCursor;
    case Cursor::Grab:
      return NSCursor.openHandCursor;
    case Cursor::Grabbing:
      return NSCursor.closedHandCursor;
    case Cursor::NotAllowed:
    case Cursor::NoDrop:
      return NSCursor.operationNotAllowedCursor;
    case Cursor::Alias:
      return NSCursor.dragLinkCursor;
    case Cursor::Copy:
      return NSCursor.dragCopyCursor;
    case Cursor::ContextMenu:
      return NSCursor.contextualMenuCursor;
    case Cursor::ColResize:
    case Cursor::EResize:
    case Cursor::WResize:
    case Cursor::EWResize:
      return NSCursor.resizeLeftRightCursor;
    case Cursor::RowResize:
    case Cursor::NResize:
    case Cursor::SResize:
    case Cursor::NSResize:
      return NSCursor.resizeUpDownCursor;
    case Cursor::None:
    case Cursor::Auto:
    default:
      return NSCursor.arrowCursor;
  }
}

} // namespace

@implementation OneMacosPointerHandler {
  __weak NSView *_root;

  // the press in flight
  __weak OneMacosViewComponentView *_touchTarget;
  Touch _touch;
  BOOL _touching;

  // views the pointer is inside, outermost first
  NSMutableArray<OneMacosViewComponentView *> *_hoverChain;
}

- (instancetype)initWithRootView:(NSView *)rootView
{
  if (self = [super init]) {
    _root = rootView;
    _hoverChain = [NSMutableArray new];
  }
  return self;
}

#pragma mark - Geometry

- (NSPoint)rootPointForEvent:(NSEvent *)event
{
  return [_root convertPoint:event.locationInWindow fromView:nil];
}

- (OneMacosViewComponentView *)reactViewAt:(NSPoint)rootPoint
{
  NSView *root = _root;
  for (NSView *subview in [root.subviews reverseObjectEnumerator]) {
    NSView *hit = [subview hitTest:rootPoint];
    if (hit) {
      return ReactViewFrom(hit, root);
    }
  }
  return nil;
}

- (Touch)touchFor:(OneMacosViewComponentView *)target
        rootPoint:(NSPoint)rootPoint
          screenPoint:(NSPoint)screenPoint
{
  Touch touch = _touch;
  touch.target = target.reactTag;
  touch.pagePoint = {(Float)rootPoint.x, (Float)rootPoint.y};
  NSPoint local = [target convertPoint:rootPoint fromView:_root];
  touch.offsetPoint = {(Float)local.x, (Float)local.y};
  touch.screenPoint = {(Float)screenPoint.x, (Float)screenPoint.y};
  touch.identifier = 0;
  touch.force = _touching ? 1.0f : 0.0f;
  touch.timestamp = (Float)NSProcessInfo.processInfo.systemUptime;
  touch.timeStamp = HighResTimeStamp::now();
  return touch;
}

- (PointerEvent)pointerEventFor:(OneMacosViewComponentView *)target
                      rootPoint:(NSPoint)rootPoint
                    screenPoint:(NSPoint)screenPoint
                          event:(NSEvent *)event
                        buttons:(int)buttons
{
  NSPoint local = [target convertPoint:rootPoint fromView:_root];
  NSEventModifierFlags flags = event.modifierFlags;
  PointerEvent pointer{};
  pointer.pointerId = 1;
  pointer.pressure = buttons ? 0.5f : 0.0f;
  pointer.pointerType = "mouse";
  pointer.clientPoint = {(Float)rootPoint.x, (Float)rootPoint.y};
  pointer.screenPoint = {(Float)screenPoint.x, (Float)screenPoint.y};
  pointer.offsetPoint = {(Float)local.x, (Float)local.y};
  pointer.width = 1;
  pointer.height = 1;
  pointer.buttons = buttons;
  pointer.ctrlKey = (flags & NSEventModifierFlagControl) != 0;
  pointer.shiftKey = (flags & NSEventModifierFlagShift) != 0;
  pointer.altKey = (flags & NSEventModifierFlagOption) != 0;
  pointer.metaKey = (flags & NSEventModifierFlagCommand) != 0;
  pointer.isPrimary = true;
  pointer.button = -1;
  pointer.timeStamp = HighResTimeStamp::now();
  return pointer;
}

- (NSPoint)screenPointForEvent:(NSEvent *)event
{
  NSPoint screen = [_root.window convertPointToScreen:event.locationInWindow];
  return screen;
}

#pragma mark - Touch

- (void)sendTouch:(void (^)(const TouchEventEmitter &, TouchEvent))send
           target:(OneMacosViewComponentView *)target
          changed:(Touch)touch
       stillDown:(BOOL)stillDown
{
  auto emitter = std::static_pointer_cast<const TouchEventEmitter>(target.eventEmitter);
  TouchEvent event;
  event.changedTouches.insert(touch);
  if (stillDown) {
    event.touches.insert(touch);
    event.targetTouches.insert(touch);
  }
  send(*emitter, std::move(event));
}

- (void)mouseDown:(NSEvent *)event
{
  NSPoint rootPoint = [self rootPointForEvent:event];
  OneMacosViewComponentView *target = [self reactViewAt:rootPoint];
  [self focusViewFor:target];
  if (!target) {
    return;
  }
  NSPoint screenPoint = [self screenPointForEvent:event];
  _touchTarget = target;
  _touching = YES;
  _touch = [self touchFor:target rootPoint:rootPoint screenPoint:screenPoint];

  [self dispatchPointer:[self pointerEventFor:target rootPoint:rootPoint screenPoint:screenPoint event:event buttons:1]
                   down:YES
                 target:target];
  [self sendTouch:^(const TouchEventEmitter &emitter, TouchEvent e) { emitter.onTouchStart(std::move(e)); }
           target:target
          changed:_touch
        stillDown:YES];
}

- (void)mouseDragged:(NSEvent *)event
{
  OneMacosViewComponentView *target = _touchTarget;
  if (!_touching || !target) {
    return;
  }
  NSPoint rootPoint = [self rootPointForEvent:event];
  _touch = [self touchFor:target rootPoint:rootPoint screenPoint:[self screenPointForEvent:event]];
  [self sendTouch:^(const TouchEventEmitter &emitter, TouchEvent e) { emitter.onTouchMove(std::move(e)); }
           target:target
          changed:_touch
        stillDown:YES];
  [self updateHoverAtRootPoint:rootPoint event:event buttons:1];
}

- (void)mouseUp:(NSEvent *)event
{
  OneMacosViewComponentView *target = _touchTarget;
  if (!_touching || !target) {
    return;
  }
  NSPoint rootPoint = [self rootPointForEvent:event];
  NSPoint screenPoint = [self screenPointForEvent:event];
  _touch = [self touchFor:target rootPoint:rootPoint screenPoint:screenPoint];
  Touch touch = _touch;
  _touching = NO;
  _touchTarget = nil;
  [self sendTouch:^(const TouchEventEmitter &emitter, TouchEvent e) { emitter.onTouchEnd(std::move(e)); }
           target:target
          changed:touch
        stillDown:NO];
  [self dispatchPointer:[self pointerEventFor:target rootPoint:rootPoint screenPoint:screenPoint event:event buttons:0]
                   down:NO
                 target:target];
}

- (void)pressView:(NSView *)view
{
  OneMacosViewComponentView *target = ReactViewFrom(view, _root);
  if (!target || !_root) {
    return;
  }
  NSPoint center = [_root convertPoint:NSMakePoint(NSMidX(target.bounds), NSMidY(target.bounds)) fromView:target];
  NSPoint screen = [_root.window convertPointToScreen:[_root convertPoint:center toView:nil]];
  _touching = NO;
  Touch start = [self touchFor:target rootPoint:center screenPoint:screen];
  [self sendTouch:^(const TouchEventEmitter &emitter, TouchEvent e) { emitter.onTouchStart(std::move(e)); }
           target:target
          changed:start
        stillDown:YES];
  Touch end = [self touchFor:target rootPoint:center screenPoint:screen];
  [self sendTouch:^(const TouchEventEmitter &emitter, TouchEvent e) { emitter.onTouchEnd(std::move(e)); }
           target:target
          changed:end
        stillDown:NO];
}

- (void)dispatchPointer:(PointerEvent)pointer down:(BOOL)down target:(OneMacosViewComponentView *)target
{
  ViewEvents::Offset bit = down ? ViewEvents::Offset::PointerDown : ViewEvents::Offset::PointerUp;
  if (![self chainFrom:target hasEvent:bit]) {
    return;
  }
  pointer.button = 0;
  auto emitter = EmitterOf(target);
  if (down) {
    emitter->onPointerDown(pointer);
  } else {
    emitter->onPointerUp(pointer);
  }
}

- (BOOL)chainFrom:(OneMacosViewComponentView *)target hasEvent:(ViewEvents::Offset)bit
{
  NSView *view = target;
  while (view && view != _root) {
    if (IsViewComponent(view)) {
      OneMacosViewComponentView *component = (OneMacosViewComponentView *)view;
      if (component.props && EventsOf(component)[bit]) {
        return YES;
      }
    }
    view = view.superview;
  }
  return NO;
}

#pragma mark - Focus

// a view takes keyboard focus when it handles presses, like a Pressable does
- (void)focusViewFor:(OneMacosViewComponentView *)target
{
  NSWindow *window = _root.window;
  NSView *view = target;
  while (view && view != _root) {
    if (view.acceptsFirstResponder) {
      [window makeFirstResponder:view];
      return;
    }
    view = view.superview;
  }
  // a click on nothing focusable clears any focused control
  [window makeFirstResponder:_root];
}

#pragma mark - Hover

- (void)mouseMoved:(NSEvent *)event
{
  [self updateHoverAtRootPoint:[self rootPointForEvent:event] event:event buttons:0];
}

- (void)mouseExited:(NSEvent *)event
{
  [self applyHoverChain:@[] target:nil rootPoint:NSZeroPoint event:event buttons:0];
  [NSCursor.arrowCursor set];
}

- (void)updateHoverAtRootPoint:(NSPoint)rootPoint event:(NSEvent *)event buttons:(int)buttons
{
  OneMacosViewComponentView *target = [self reactViewAt:rootPoint];
  NSMutableArray<OneMacosViewComponentView *> *chain = [NSMutableArray new];
  for (NSView *view = target; view && view != _root; view = view.superview) {
    if (IsViewComponent(view) && ((OneMacosViewComponentView *)view).eventEmitter) {
      [chain insertObject:(OneMacosViewComponentView *)view atIndex:0];
    }
  }
  [self applyHoverChain:chain target:target rootPoint:rootPoint event:event buttons:buttons];
}

- (void)applyHoverChain:(NSArray<OneMacosViewComponentView *> *)chain
                 target:(OneMacosViewComponentView *)target
              rootPoint:(NSPoint)rootPoint
                  event:(NSEvent *)event
                buttons:(int)buttons
{
  NSPoint screenPoint = [self screenPointForEvent:event];
  OneMacosViewComponentView *oldTarget = _hoverChain.lastObject;

  // the element moves enter and leave only for the views the pointer crossed
  NSMutableArray<OneMacosViewComponentView *> *left = [NSMutableArray new];
  for (OneMacosViewComponentView *view in [_hoverChain reverseObjectEnumerator]) {
    if (![chain containsObject:view]) {
      [left addObject:view];
    }
  }
  NSMutableArray<OneMacosViewComponentView *> *entered = [NSMutableArray new];
  for (OneMacosViewComponentView *view in chain) {
    if (![_hoverChain containsObject:view]) {
      [entered addObject:view];
    }
  }

  if (oldTarget && oldTarget != target && oldTarget.props && EventsOf(oldTarget)[ViewEvents::Offset::PointerOut]) {
    EmitterOf(oldTarget)->onPointerOut([self pointerEventFor:oldTarget rootPoint:rootPoint screenPoint:screenPoint event:event buttons:buttons]);
  }
  for (OneMacosViewComponentView *view in left) {
    if (view.props && EventsOf(view)[ViewEvents::Offset::PointerLeave]) {
      EmitterOf(view)->onPointerLeave([self pointerEventFor:view rootPoint:rootPoint screenPoint:screenPoint event:event buttons:buttons]);
    }
  }
  if (target && target != oldTarget && target.props && EventsOf(target)[ViewEvents::Offset::PointerOver]) {
    EmitterOf(target)->onPointerOver([self pointerEventFor:target rootPoint:rootPoint screenPoint:screenPoint event:event buttons:buttons]);
  }
  for (OneMacosViewComponentView *view in entered) {
    if (view.props && EventsOf(view)[ViewEvents::Offset::PointerEnter]) {
      EmitterOf(view)->onPointerEnter([self pointerEventFor:view rootPoint:rootPoint screenPoint:screenPoint event:event buttons:buttons]);
    }
  }
  if (target && [self chainFrom:target hasEvent:ViewEvents::Offset::PointerMove]) {
    EmitterOf(target)->onPointerMove([self pointerEventFor:target rootPoint:rootPoint screenPoint:screenPoint event:event buttons:buttons]);
  }

  _hoverChain = [chain mutableCopy];
  [self applyCursor];
}

- (void)applyCursor
{
  for (OneMacosViewComponentView *view in [_hoverChain reverseObjectEnumerator]) {
    if (!view.props) {
      continue;
    }
    Cursor cursor = static_cast<const ViewProps &>(*view.props).cursor;
    if (cursor != Cursor::Auto) {
      [CursorFor(cursor) set];
      return;
    }
  }
  [NSCursor.arrowCursor set];
}

@end
